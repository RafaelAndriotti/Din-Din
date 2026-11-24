// Listas fixas e regras de apresentação ligadas às despesas.

// Valores aceitos pela API (backend/src/validators/despesasValidator.js) e o rótulo exibido.
export const ROTULOS_METODO = {
  PIX: 'PIX',
  DEBITO: 'Cartão de Débito',
  CREDITO: 'Cartão de Crédito'
};
export const METODOS_PAGAMENTO = Object.keys(ROTULOS_METODO);

export const ROTULOS_STATUS = { PAGO: 'Pago', PENDENTE: 'Pendente' };
// Numa entrada, o mesmo status quer dizer "recebido" ou "a receber".
export const ROTULOS_STATUS_ENTRADA = { PAGO: 'Recebido', PENDENTE: 'A receber' };

export const isEntrada = (item) => item?.tipo === 'ENTRADA';

export function rotuloStatus(item) {
  const rotulos = isEntrada(item) ? ROTULOS_STATUS_ENTRADA : ROTULOS_STATUS;
  return rotulos[normalizarStatus(item?.status)];
}

// "Marcar como pago" numa saída, "Marcar como recebido" numa entrada.
export function rotuloMarcar(item) {
  return isEntrada(item) ? 'Marcar como recebido' : 'Marcar como pago';
}

// Linha de apoio da lista: "Entrada", "Cartão de Crédito · parcela 3 de 10" ou "PIX · À vista".
export function rotuloPagamento(item) {
  if (isEntrada(item)) return 'Entrada';
  if (item.parcelaAtual) return `${rotuloMetodo(item.metodoPagamento)} · parcela ${item.parcelaAtual} de ${item.parcelas}`;
  return null;
}

// Limites do contrato da API, espelhados no formulário.
export const LIMITES = { descricao: 100, categoria: 20, valorMaximo: 10000, parcelasMax: 48 };

// Sugestões para entradas de dinheiro.
export const CATEGORIAS_ENTRADA = ['Salário', 'Freelance', 'Rendimentos', 'Reembolso', 'Presente', 'Vendas'];

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
  'compras': '#F59E0B',
  'salário': '#34D399',
  'freelance': '#22D3EE',
  'rendimentos': '#4ADE80',
  'reembolso': '#818CF8',
  'presente': '#F472B6',
  'vendas': '#FBBF24'
};

export const COR_NEUTRA = '#64748B';

export function corDaCategoria(nome, categoriasApi = []) {
  if (!nome) return COR_NEUTRA;
  const chave = nome.toLowerCase();
  const daApi = categoriasApi.find((c) => c.nome?.toLowerCase() === chave);
  return corSegura(daApi?.cor) || CORES_PADRAO[chave] || COR_NEUTRA;
}

// A cor vem da API e vai direto para um style inline. Só aceitamos hexadecimal:
// um valor como url(https://...) faria o navegador chamar um servidor de fora.
function corSegura(cor) {
  return typeof cor === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(cor) ? cor : null;
}

function semAcento(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Lê com tolerância: o banco ainda tem métodos antigos ("Cartão de Crédito", "Boleto"...).
// Devolve PIX/DEBITO/CREDITO, ou null quando o método não tem equivalente aceito.
export function normalizarMetodo(metodo) {
  const m = semAcento(metodo);
  if (m === 'pix') return 'PIX';
  if (m.includes('credito')) return 'CREDITO';
  if (m.includes('debito')) return 'DEBITO';
  return null;
}

export function rotuloMetodo(metodo) {
  return ROTULOS_METODO[normalizarMetodo(metodo)] || metodo || 'Não informado';
}

// Linhas antigas têm 'pago'/'pendente' minúsculo. Qualquer coisa que não seja "pago" conta como pendente.
export function normalizarStatus(status) {
  return String(status ?? '').toUpperCase() === 'PAGO' ? 'PAGO' : 'PENDENTE';
}

export function isCartaoCredito(metodo) {
  return normalizarMetodo(metodo) === 'CREDITO';
}

// Padrão inteligente: crédito é pago na fatura, depois; PIX e débito saem na hora.
export function statusPadrao(metodo) {
  return isCartaoCredito(metodo) ? 'PENDENTE' : 'PAGO';
}

// Monta o corpo exato que o validator do backend aceita (despesasValidator.js).
// Método sem equivalente vai como está: o back recusa e o erro aparece no campo certo.
export function toPayload(despesa) {
  return {
    descricao: String(despesa.descricao ?? '').trim(),
    valor: Math.round(Number(despesa.valor) * 100) / 100,
    categoria: String(despesa.categoria ?? '').trim(),
    metodoPagamento: normalizarMetodo(despesa.metodoPagamento) ?? String(despesa.metodoPagamento ?? ''),
    // Linhas antigas usam 0 para "à vista"; o contrato exige inteiro >= 1.
    parcelas: Math.max(1, Math.trunc(Number(despesa.parcelas)) || 1),
    status: normalizarStatus(despesa.status),
    tipo: isEntrada(despesa) ? 'ENTRADA' : 'SAIDA',
    ...(despesa.mes ? { mes: despesa.mes } : {})
  };
}
