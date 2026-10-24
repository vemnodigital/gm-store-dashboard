// Intermediário entre o painel do cliente e o Meta (Vercel) — mesmas regras do servidor/api.php.
// O token fica só na variável de ambiente GM_TOKEN; o navegador nunca o recebe.
// Variáveis: GM_TOKEN (token do Meta), GM_CONTA (act_...), GM_AUTH (sha256 da chave dos dados,
// gerado pelo gerar_cliente.py), GM_VERSAO (opcional, padrão v19.0), GM_BASE (só testes locais)
const crypto = require('crypto');

const PERMITIDOS = ['fields', 'time_range', 'time_increment', 'level', 'limit', 'after'];

// Cache curto em memória (a instância da função é reaproveitada entre acessos): poupa o limite de
// chamadas do Meta quando o painel é aberto várias vezes. Só guarda respostas sem erro.
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const falha = (codigo, msg) => res.status(codigo).json({ error: { message: msg } });

  if (req.method !== 'GET') return falha(405, 'Método não permitido');
  const { GM_TOKEN: token, GM_CONTA: conta, GM_AUTH: auth } = process.env;
  if (!token || !conta || !auth) return falha(503, 'Dashboard em configuração. Fale com a Vem no Digital.');

  // X-GM-Auth = sha256 da chave que decifra gmstore_dados.js — só quem sabe a senha do cliente tem
  const enviado = Buffer.from(String(req.headers['x-gm-auth'] || ''));
  const esperado = Buffer.from(auth);
  if (enviado.length !== esperado.length || !crypto.timingSafeEqual(enviado, esperado)) {
    return falha(401, 'Sessão expirada. Entre de novo com a senha.');
  }

  const q = req.query || {};
  const path = typeof q.path === 'string' ? q.path : '';
  const ehDaConta = path === `${conta}/insights` || path === `${conta}/ads`;
  const ehAnuncio = /^\d{5,25}$/.test(path);   // prévia (thumbnail) de um anúncio
  if (!ehDaConta && !ehAnuncio) return falha(403, 'Consulta não permitida');

  let params = {};
  for (const p of PERMITIDOS) if (typeof q[p] === 'string') params[p] = q[p];
  // Só a prévia do criativo, e só de anúncio que pertence à conta da GM
  if (ehAnuncio) params = { fields: 'account_id,creative{thumbnail_url,image_url}' };

  const chaveCache = path + '?' + new URLSearchParams(params);   // sem o token
  const guardado = cache.get(chaveCache);
  // Status dos anúncios (/ads) muda pouco e tem limite de chamadas mais baixo no Meta: 30 min
  const validade = path.endsWith('/ads') ? 3 * CACHE_MS : CACHE_MS;
  if (guardado && Date.now() - guardado.em < validade) return res.status(200).json(guardado.dados);

  params.access_token = token;
  const base = process.env.GM_BASE || 'https://graph.facebook.com/';
  const url = `${base}${process.env.GM_VERSAO || 'v19.0'}/${path}?${new URLSearchParams(params)}`;
  let resposta, dados;
  try {
    resposta = await fetch(url, { signal: AbortSignal.timeout(60000) });
    dados = await resposta.json();
  } catch (e) {
    return falha(502, 'Meta indisponível. Tente de novo em instantes.');
  }
  if (!dados || typeof dados !== 'object') return falha(502, 'Resposta inválida do Meta');

  if (ehAnuncio && !dados.error) {
    if (`act_${dados.account_id || ''}` !== conta) return falha(403, 'Consulta não permitida');
    delete dados.account_id;
  }
  // O link "next" do Meta traz o token: sai daqui, e o painel pagina pelo cursor "after"
  if (dados.paging) {
    if (dados.paging.next) dados.paging.tem_mais = true;
    delete dados.paging.next;
    delete dados.paging.previous;
  }
  if (resposta.ok && !dados.error) {
    if (cache.size > 500) cache.clear();
    cache.set(chaveCache, { em: Date.now(), dados });
  }
  res.status(resposta.status).json(dados);
};
