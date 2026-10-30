// Listas fixas e regras de apresentação ligadas às despesas.

// Valores gravados no banco. Mantidos exatamente como já eram enviados,
// para não criar duas grafias da mesma forma de pagamento.
export const METODOS_PAGAMENTO = [
  'PIX',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto',
  'Dinheiro',
  'Transferência'
];

// Usadas quando GET /categorias não responde ou ainda não tem cadastro.
export const CATEGORIAS_PADRAO = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Lazer',
  'Educação',
  'Tecnologia',
  'Compras'
];

// Cor decorativa das categorias padrão. A cor real vem do campo "cor" de /categorias.
const CORES_PADRAO = {
  'alimentação': '#FB923C',
  'moradia': '#60A5FA',
  'transporte': '#A78BFA',
  'saúde': '#F472B6',
  'lazer': '#FACC15',
  'educação': '#2DD4BF',
  'tecnologia': '#94A3B8',
  'compras': '#F59E0B'
};

export const COR_NEUTRA = '#64748B';

export function corDaCategoria(nome, categoriasApi = []) {
  if (!nome) return COR_NEUTRA;
  const chave = nome.toLowerCase();
  const daApi = categoriasApi.find((c) => c.nome?.toLowerCase() === chave);
  return daApi?.cor || CORES_PADRAO[chave] || COR_NEUTRA;
}

function semAcento(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function isCartaoCredito(metodo) {
  return semAcento(metodo).includes('credito');
}

// Padrão inteligente: boleto costuma ser pago depois; o resto, na hora.
export function statusPadrao(metodo) {
  return semAcento(metodo) === 'boleto' ? 'pendente' : 'pago';
}

// Monta o corpo exato que o validator do backend aceita (despesasValidator.js).
export function toPayload(despesa) {
  return {
    descricao: String(despesa.descricao ?? '').trim(),
    valor: Number(despesa.valor),
    categoria: String(despesa.categoria ?? '').trim(),
    metodoPagamento: String(despesa.metodoPagamento ?? '').trim(),
    parcelas: Number(despesa.parcelas) || 0,
    status: String(despesa.status || 'pendente').trim()
  };
}
