// Serviço de comunicação com o backend.
// Regra principal: nunca transformar uma falha em sucesso simulado.
// Toda resposta que não for 2xx vira ApiError, e quem chamou decide o que mostrar.

import { normalizarMetodo, normalizarStatus, toPayload } from '../utils/despesas';

const DESPESAS_URL = '/despesas';
const CATEGORIAS_URL = '/categorias';
// Teto de itens por página no backend (paginacaoSchema): as listagens buscam página a página.
const POR_PAGINA = 100;
const CHAVE_TOKEN = 'din-din-token';

// Dados de exemplo usados só em desenvolvimento, quando o backend não está de pé.
const FALLBACK_DESPESAS = [
  { id: 1, descricao: 'Supermercado Mensal', valor: 450.0, categoria: 'Alimentação', metodoPagamento: 'PIX', parcelas: 1, status: 'PAGO' },
  { id: 2, descricao: 'Conta de Energia', valor: 185.3, categoria: 'Moradia', metodoPagamento: 'DEBITO', parcelas: 1, status: 'PENDENTE' },
  { id: 3, descricao: 'Notebook para Trabalho', valor: 3600.0, categoria: 'Tecnologia', metodoPagamento: 'CREDITO', parcelas: 10, status: 'PAGO' }
];

// kind: 'network' (sem conexão), 'validation' (400), 'auth' (401), 'not_found' (404),
// 'conflict' (409), 'rate_limit' (429) ou 'server' (outros).
export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'server', issues = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.issues = issues;
  }
}

const MENSAGENS = {
  network: 'Sem conexão com o servidor.',
  validation: 'Os dados foram recusados pelo servidor.',
  auth: 'Sua sessão expirou. Entre de novo.',
  not_found: 'Registro não encontrado.',
  conflict: 'Já existe um registro com esses dados.',
  rate_limit: 'Muitas tentativas seguidas. Espere alguns minutos.',
  server: 'O servidor encontrou um erro.'
};

const KIND_POR_STATUS = { 400: 'validation', 401: 'auth', 404: 'not_found', 409: 'conflict', 429: 'rate_limit' };

// ---------- Sessão ----------
// O token (JWT) fica na memória e no localStorage, para sobreviver ao recarregar a página.
// Ele vence em 1 hora, e a CSP do build só deixa rodar scripts do próprio site.
// Sem localStorage (modo privado, armazenamento bloqueado), a sessão vale até recarregar.
let token = lerTokenSalvo();
let aoPerderSessao = null;

function lerTokenSalvo() {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
}

function definirToken(novo) {
  token = novo;
  try {
    if (novo) localStorage.setItem(CHAVE_TOKEN, novo);
    else localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // sem localStorage: fica só na memória
  }
}

export const temSessao = () => Boolean(token);

export function sair() {
  definirToken(null);
}

// O App registra aqui o que fazer quando o servidor recusar o token (401): voltar ao login.
export function quandoPerderSessao(fn) {
  aoPerderSessao = fn;
  return () => {
    if (aoPerderSessao === fn) aoPerderSessao = null;
  };
}

async function request(url, options = {}) {
  const enviouToken = Boolean(token);
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(enviouToken ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  } catch {
    // fetch só rejeita em falha de rede (TypeError).
    throw new ApiError(MENSAGENS.network, { kind: 'network' });
  }

  if (response.status === 204) return null;

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;

  if (response.ok) return body;

  let kind = KIND_POR_STATUS[response.status] ?? 'server';
  // O proxy do Vite responde 5xx sem JSON quando o backend está desligado.
  if (kind === 'server' && response.status >= 500 && !isJson) kind = 'network';

  // Token vencido ou inválido: descarta e avisa o App. No login, 401 é só senha errada.
  if (kind === 'auth' && enviouToken) {
    definirToken(null);
    aoPerderSessao?.();
  }

  throw new ApiError(MENSAGENS[kind], {
    status: response.status,
    kind,
    issues: Array.isArray(body?.erros) ? body.erros : []
  });
}

// O Postgres devolve NUMERIC como string ("450.00"). Na tela, tratamos como número.
// Linhas antigas: status minúsculo e métodos com nome por extenso viram os valores do contrato.
// Método sem equivalente (ex.: "Boleto") fica como veio, para exibir e forçar a troca na edição.
function normalizarDespesa(d) {
  return {
    ...d,
    valor: Number(d.valor) || 0,
    parcelas: Number(d.parcelas) || 0,
    status: normalizarStatus(d.status),
    metodoPagamento: normalizarMetodo(d.metodoPagamento) ?? d.metodoPagamento
  };
}

// O backend devolve no máximo POR_PAGINA itens por vez; uma página incompleta é a última.
// shortcut: paginação por OFFSET pode pular ou repetir um item se a lista mudar entre duas páginas; trocar por cursor (id > último) no backend se isso virar problema.
async function buscarTodas(url) {
  const todas = [];
  for (let pagina = 1; ; pagina += 1) {
    const lote = (await request(`${url}?pagina=${pagina}&limite=${POR_PAGINA}`)) || [];
    todas.push(...lote);
    if (lote.length < POR_PAGINA) return todas;
  }
}

async function autenticar(url, email, senha) {
  const { token: novo } = await request(url, { method: 'POST', body: JSON.stringify({ email, senha }) });
  definirToken(novo);
}

export const entrar = (email, senha) => autenticar('/auth/login', email, senha);
export const criarConta = (email, senha) => autenticar('/auth/registro', email, senha);

// Devolve { data, isFallback, error }. Nunca lança.
// Fallback só em falha de rede e só em desenvolvimento. 4xx/5xx viram erro.
export async function getDespesas() {
  try {
    const data = await buscarTodas(DESPESAS_URL);
    return { data: data.map(normalizarDespesa), isFallback: false, error: null };
  } catch (error) {
    if (error.kind === 'network' && import.meta.env.DEV) {
      console.warn('Backend inacessível. Exibindo dados de exemplo. Suba a API com: npm run dev');
      return { data: FALLBACK_DESPESAS.map(normalizarDespesa), isFallback: true, error };
    }
    return { data: null, isFallback: false, error };
  }
}

export async function createDespesa(despesa) {
  const criada = await request(DESPESAS_URL, { method: 'POST', body: JSON.stringify(toPayload(despesa)) });
  return normalizarDespesa(criada);
}

// O validator exige o corpo completo, por isso sempre enviamos todos os campos.
export async function updateDespesa(id, despesa) {
  const atualizada = await request(`${DESPESAS_URL}/${id}`, { method: 'PUT', body: JSON.stringify(toPayload(despesa)) });
  return normalizarDespesa(atualizada);
}

export async function deleteDespesa(id, { keepalive = false } = {}) {
  await request(`${DESPESAS_URL}/${id}`, { method: 'DELETE', keepalive });
}

// Categorias são opcionais para a tela: se a rota falhar, o formulário usa a lista padrão.
export async function getCategorias() {
  try {
    const data = await buscarTodas(CATEGORIAS_URL);
    return data.filter((c) => c.ativo !== false);
  } catch (error) {
    console.warn('Não foi possível carregar /categorias. Usando a lista padrão.', error.message);
    return [];
  }
}
