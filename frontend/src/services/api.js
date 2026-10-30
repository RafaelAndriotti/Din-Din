// Serviço de comunicação com o backend

const BASE_URL = '/despesas';

// Mock de fallback caso o backend ainda não tenha sido iniciado pelo usuário
const FALLBACK_DESPESAS = [
  {
    id: 1,
    descricao: 'Supermercado Mensal',
    valor: 450.00,
    categoria: 'Alimentação',
    metodoPagamento: 'PIX',
    parcelas: 0,
    status: 'pago'
  },
  {
    id: 2,
    descricao: 'Conta de Energia',
    valor: 185.30,
    categoria: 'Moradia',
    metodoPagamento: 'Boleto',
    parcelas: 0,
    status: 'pendente'
  },
  {
    id: 3,
    descricao: 'Notebook para Trabalho',
    valor: 3600.00,
    categoria: 'Tecnologia',
    metodoPagamento: 'Cartão de Crédito',
    parcelas: 10,
    status: 'pago'
  }
];

export async function checkBackendHealth() {
  try {
    const res = await fetch('/despesas', { method: 'GET', headers: { 'Accept': 'application/json' } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getDespesas() {
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return { data, isFallback: false };
  } catch (error) {
    console.warn('Backend inacessível no momento, utilizando dados de demonstração:', error.message);
    return { data: FALLBACK_DESPESAS, isFallback: true };
  }
}

export async function getDespesaById(id) {
  try {
    const response = await fetch(`${BASE_URL}/${id}`);
    if (!response.ok) {
      throw new Error(`Erro ao buscar despesa #${id}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    const item = FALLBACK_DESPESAS.find(d => d.id === Number(id));
    if (item) return item;
    throw error;
  }
}

export async function createDespesa(despesaData) {
  // Converte e formata os dados conforme esperado pelo despesaSchema do Zod no backend:
  // descricao (string), categoria (string), metodoPagamento (string), parcelas (number), status (string), valor (number)
  const payload = {
    descricao: String(despesaData.descricao).trim(),
    categoria: String(despesaData.categoria).trim(),
    metodoPagamento: String(despesaData.metodoPagamento).trim(),
    parcelas: Number(despesaData.parcelas || 0),
    status: String(despesaData.status || 'pendente').trim(),
    valor: Number(despesaData.valor)
  };

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const errorMsg = errJson?.message || 'Falha ao cadastrar despesa no backend';
      const issues = errJson?.erros?.map(e => `${e.path?.join('.')}: ${e.message}`).join(', ');
      throw new Error(issues ? `${errorMsg} (${issues})` : errorMsg);
    }

    return await response.json();
  } catch (error) {
    console.warn('Falha na criação via backend, simulando inclusão local:', error.message);
    const novaLocal = {
      id: Date.now(),
      ...payload
    };
    return novaLocal;
  }
}
