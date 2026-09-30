// n8n Code node — "Kommo → Dashboard Comercial GM Store"
// Modo: Run Once for All Items
//
// Variáveis de ambiente do n8n (recomendado):
//   KOMMO_SUBDOMAIN  ex.: gmstore            (de gmstore.kommo.com)
//   KOMMO_TOKEN      token de longa duração da integração privada do Kommo
//   GMC_KEY          chave simples que o dashboard envia em ?key=
// Se o seu n8n bloqueia $env (n8n Cloud / N8N_BLOCK_ENV_ACCESS_IN_NODE=true),
// preencha os valores direto abaixo — eles ficam só no servidor do n8n, nunca no HTML.

const SUB = $env.KOMMO_SUBDOMAIN || 'PREENCHER';
const TOKEN = $env.KOMMO_TOKEN || 'PREENCHER';
const KEY = $env.GMC_KEY || '';

const query = $input.first().json.query || {};
if (KEY && query.key !== KEY) {
  return [{ json: { error: 'Chave de acesso inválida' } }];
}

const http = this.helpers;
const BASE = `https://${SUB}.kommo.com/api/v4`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(path) {
  const res = await http.httpRequest({
    method: 'GET',
    url: BASE + path,
    headers: { Authorization: `Bearer ${TOKEN}` },
    json: true,
  });
  return res || null; // Kommo responde 204 (vazio) quando não há resultados
}

async function allLeads(filter) {
  const out = [];
  for (let page = 1; page <= 200; page++) {
    const r = await get(`/leads?limit=250&page=${page}&with=loss_reason&${filter}`);
    const arr = r?._embedded?.leads || [];
    out.push(...arr);
    if (arr.length < 250) break;
    await sleep(150); // limite do Kommo: 7 req/s
  }
  return out;
}

const from = parseInt(query.from) || Math.floor(Date.now() / 1000) - 400 * 86400;
const f = (field) => `${encodeURIComponent(`filter[${field}][from]`)}=${from}`;

// Leads criados no período + leads fechados no período (podem ter sido criados antes)
const [criados, fechados] = [await allLeads(f('created_at')), await allLeads(f('closed_at'))];
const byId = new Map();
[...criados, ...fechados].forEach(l => byId.set(l.id, l));

// Dicionários: etapas, funis, usuários, motivos de perda
const pipesRes = await get('/leads/pipelines');
const statusMap = {};
const pipeName = {};
for (const p of pipesRes?._embedded?.pipelines || []) {
  pipeName[p.id] = p.name;
  for (const s of p._embedded?.statuses || []) statusMap[`${p.id}:${s.id}`] = { name: s.name, sort: s.sort };
}
const usersRes = await get('/users?limit=250');
const userName = {};
for (const u of usersRes?._embedded?.users || []) userName[u.id] = u.name;
let lossName = {};
try {
  const lr = await get('/leads/loss_reasons');
  for (const r of lr?._embedded?.loss_reasons || []) lossName[r.id] = r.name;
} catch (e) { /* conta sem motivos de perda configurados */ }

const leads = [...byId.values()].map(l => {
  const campos = {};
  for (const cf of l.custom_fields_values || []) {
    campos[cf.field_name] = (cf.values || []).map(v => v.value ?? v.enum_code ?? '').filter(Boolean).join(', ');
  }
  const status = l.status_id === 142 ? 'won' : l.status_id === 143 ? 'lost' : 'open';
  const st = statusMap[`${l.pipeline_id}:${l.status_id}`] || {};
  return {
    id: l.id,
    nome: l.name,
    valor: l.price || 0,
    criado: l.created_at,
    fechado: l.closed_at || null,
    atualizado: l.updated_at,
    status,
    etapa: st.name || (status === 'won' ? 'Venda ganha' : status === 'lost' ? 'Venda perdida' : '—'),
    etapaOrdem: st.sort ?? 999,
    funil: pipeName[l.pipeline_id] || '',
    resp: userName[l.responsible_user_id] || 'Sem responsável',
    campos,
    tags: (l._embedded?.tags || []).map(t => t.name),
    motivo: status === 'lost'
      ? (l._embedded?.loss_reason?.[0]?.name || lossName[l.loss_reason_id] || 'Sem motivo informado')
      : null,
  };
});

return [{ json: { subdomain: SUB, geradoEm: new Date().toISOString(), total: leads.length, leads } }];
