// Vendas publicadas pelo admin (botão "☁ Publicar"): ficam cifradas num Blob privado da Vercel.
// GET  → pacote cifrado mais recente (mesmo formato do gmstore_dados.js; sem a senha é ilegível)
// POST → só o admin: cabeçalho X-GM-Admin = sha256 do segredo derivado da senha do admin (env GM_ADMIN_AUTH)
// Cada publicação também guarda uma cópia datada em dados/historico/ (últimas 60) para desfazer erros.
const crypto = require('crypto');
const { put, get, list, del } = require('@vercel/blob');

const ATUAL = 'dados/atual.json';
const HISTORICO = 'dados/historico/';
const ORIGENS = ['https://vemnodigital.github.io', 'https://gmstore-relatorio.vercel.app'];

function liberarOrigem(req, res) {
  const origem = req.headers.origin || '';
  if (ORIGENS.includes(origem) || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origem)) {
    res.setHeader('Access-Control-Allow-Origin', origem);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-GM-Admin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
}

function pacoteValido(p) {
  return p && typeof p === 'object' && p.v === 1 && Number.isInteger(p.iter)
    && ['salt', 'iv', 'dados', 'geradoEm'].every(k => typeof p[k] === 'string')
    && p.dados.length < 2_000_000;
}

async function lerAtual() {
  const r = await get(ATUAL, { access: 'private', useCache: false });
  return r ? JSON.parse(await new Response(r.stream).text()) : null;
}

module.exports = async (req, res) => {
  liberarOrigem(req, res);
  res.setHeader('Cache-Control', 'no-store');
  const falha = (codigo, msg) => res.status(codigo).json({ error: { message: msg } });
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    try {
      const atual = await lerAtual();
      return atual ? res.status(200).json(atual) : falha(404, 'Nada publicado ainda');
    } catch (e) {
      return falha(502, 'Não foi possível ler as vendas publicadas');
    }
  }
  if (req.method !== 'POST') return falha(405, 'Método não permitido');

  const esperado = Buffer.from(process.env.GM_ADMIN_AUTH || '');
  const enviado = Buffer.from(String(req.headers['x-gm-admin'] || ''));
  if (!esperado.length || enviado.length !== esperado.length || !crypto.timingSafeEqual(enviado, esperado)) {
    return falha(401, 'Só o admin pode publicar. Entre de novo com a senha do admin.');
  }

  const pacote = typeof req.body === 'string' ? JSON.parse(req.body || 'null') : req.body;
  if (!pacoteValido(pacote)) return falha(400, 'Pacote de vendas inválido');
  try {
    // A senha do cliente (salt) não pode mudar por aqui: o cliente deixaria de conseguir entrar
    const atual = await lerAtual();
    if (atual && atual.salt !== pacote.salt) return falha(409, 'A chave das vendas mudou — publique pelo fluxo de troca de senha.');

    const corpo = JSON.stringify({ v: 1, iter: pacote.iter, salt: pacote.salt, iv: pacote.iv, dados: pacote.dados, geradoEm: pacote.geradoEm });
    const opcoes = { access: 'private', contentType: 'application/json', addRandomSuffix: false };
    await put(ATUAL, corpo, { ...opcoes, allowOverwrite: true });
    await put(HISTORICO + pacote.geradoEm.replace(/[:.]/g, '-') + '.json', corpo, { ...opcoes, allowOverwrite: true });

    const { blobs } = await list({ prefix: HISTORICO });
    if (blobs.length > 60) {
      const velhos = blobs.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt)).slice(0, blobs.length - 60);
      await del(velhos.map(b => b.url));
    }
    return res.status(200).json({ ok: true, publicadoEm: pacote.geradoEm });
  } catch (e) {
    return falha(502, 'Não foi possível salvar as vendas — tente de novo.');
  }
};
