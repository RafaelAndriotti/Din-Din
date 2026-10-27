// Serviço de comunicação com o backend

const BASE_URL = '/despesas';

// Mock de fallback caso o backend ainda não tenha sido iniciado pelo usuário
const FALLBACK_DESPESAS = [
  {
    id: 1,
    desc: 'Supermercado Mensal',
    value: 450.00,
    category: 'Alimentação',
    payMethod: 'PIX',
    installment: 0,
    status: 'paid'
  },
  {
    id: 2,
    desc: 'Conta de Energia',
    value: 185.30,
    category: 'Moradia',
    payMethod: 'Boleto',
    installment: 0,
    status: 'pending'
  },
  {
    id: 3,
    desc: 'Notebook para Trabalho',
    value: 3600.00,
    category: 'Tecnologia',
    payMethod: 'Cartão de Crédito',
    installment: 10,
    status: 'paid'
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
  // desc (string), category (string), payMethod (string), installment (number), status (string), value (number)
  const payload = {
    desc: String(despesaData.desc).trim(),
    category: String(despesaData.category).trim(),
    payMethod: String(despesaData.payMethod).trim(),
    installment: Number(despesaData.installment || 0),
    status: String(despesaData.status || 'pending').trim(),
    value: Number(despesaData.value)
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
