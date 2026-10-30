// Formatação no padrão brasileiro e regras de exibição das despesas.

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentual = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

export function formatCurrency(valor) {
  return moeda.format(Number(valor) || 0);
}

// "1.234,56" (sem o "R$"), usado para preencher o campo de valor na edição.
export function formatDecimal(valor) {
  return decimal.format(Number(valor) || 0);
}

export function formatPercent(fracao) {
  return percentual.format(fracao || 0);
}

export function isPago(despesa) {
  return String(despesa?.status).toLowerCase() === 'pago';
}

// Converte o que a pessoa digitou no campo de valor para número.
// Aceita "1.234,56", "1234,56", "1234.56" e "1.234".
// Devolve NaN quando o texto não é um valor válido com até 2 casas decimais.
export function parseValor(texto) {
  let limpo = String(texto ?? '').replace(/R\$|\s/g, '');
  if (!limpo) return NaN;

  if (limpo.includes(',')) {
    // Padrão brasileiro: ponto é milhar, vírgula é decimal.
    limpo = limpo.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // "1.234" ou "1.234.567": só pontos de milhar.
    limpo = limpo.replace(/\./g, '');
  }

  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return NaN;
  return Number(limpo);
}

// Texto de parcelamento. "valor" é o total da compra (semântica atual da API).
// O valor da parcela só aparece quando a divisão é exata em centavos,
// para não exibir um número arredondado que a pessoa não vai pagar.
export function formatParcelas(parcelas, valor) {
  const n = Number(parcelas) || 0;
  if (n <= 1) return 'À vista';

  const centavos = Math.round((Number(valor) || 0) * 100);
  if (centavos > 0 && centavos % n === 0) {
    return `${n}x de ${formatCurrency(centavos / n / 100)}`;
  }
  return `Parcelado em ${n}x`;
}

export function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}
