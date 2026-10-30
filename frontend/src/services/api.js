// Serviço de comunicação com o backend.
// Regra principal: nunca transformar uma falha em sucesso simulado.
// Toda resposta que não for 2xx vira ApiError, e quem chamou decide o que mostrar.

import { toPayload } from '../utils/despesas';

const DESPESAS_URL = '/despesas';
const CATEGORIAS_URL = '/categorias';

// Dados de exemplo usados só em desenvolvimento, quando o backend não está de pé.
const FALLBACK_DESPESAS = [
  { id: 1, descricao: 'Supermercado Mensal', valor: 450.0, categoria: 'Alimentação', metodoPagamento: 'PIX', parcelas: 0, status: 'pago' },
  { id: 2, descricao: 'Conta de Energia', valor: 185.3, categoria: 'Moradia', metodoPagamento: 'Boleto', parcelas: 0, status: 'pendente' },
  { id: 3, descricao: 'Notebook para Trabalho', valor: 3600.0, categoria: 'Tecnologia', metodoPagamento: 'Cartão de Crédito', parcelas: 10, status: 'pago' }
];

// kind: 'network' (sem conexão), 'validation' (400), 'not_found' (404) ou 'server' (outros).
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
  not_found: 'Registro não encontrado.',
  server: 'O servidor encontrou um erro.'
};

async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) }
    });
  } catch {
    // fetch só rejeita em falha de rede (TypeError).
    throw new ApiError(MENSAGENS.network, { kind: 'network' });
  }

  if (response.status === 204) return null;

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;

  if (response.ok) return body;

  let kind = 'server';
  if (response.status === 400) kind = 'validation';
  else if (response.status === 404) kind = 'not_found';
  // O proxy do Vite responde 5xx sem JSON quando o backend está desligado.
  else if (response.status >= 500 && !isJson) kind = 'network';

  throw new ApiError(MENSAGENS[kind], {
    status: response.status,
    kind,
    issues: Array.isArray(body?.erros) ? body.erros : []
  });
}

// O Postgres devolve NUMERIC como string ("450.00"). Na tela, tratamos como número.
function normalizarDespesa(d) {
  return { ...d, valor: Number(d.valor) || 0, parcelas: Number(d.parcelas) || 0 };
}

// Devolve { data, isFallback, error }. Nunca lança.
// Fallback só em falha de rede e só em desenvolvimento. 4xx/5xx viram erro.
export async function getDespesas() {
  try {
    const data = await request(DESPESAS_URL);
    return { data: (data || []).map(normalizarDespesa), isFallback: false, error: null };
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
    const data = await request(CATEGORIAS_URL);
    return Array.isArray(data) ? data.filter((c) => c.ativo !== false) : [];
  } catch (error) {
    console.warn('Não foi possível carregar /categorias. Usando a lista padrão.', error.message);
    return [];
  }
}
