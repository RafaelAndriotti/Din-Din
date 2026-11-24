// Meses no formato da API: 'AAAA-MM' (ex.: '2026-11').

const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

// Mês do relógio da pessoa (fuso local), não do servidor.
export function mesAtual(agora = new Date()) {
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

// somarMeses('2026-12', 1) === '2027-01'
export function somarMeses(mes, n) {
  const [ano, m] = mes.split('-').map(Number);
  return mesAtual(new Date(ano, m - 1 + n, 1));
}

// '2026-11' -> 'Novembro de 2026'
export function rotuloMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  const texto = nomeMes.format(new Date(ano, m - 1, 1));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
