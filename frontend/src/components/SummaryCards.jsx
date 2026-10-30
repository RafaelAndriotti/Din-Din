import React from 'react';
import { Clock, CircleCheck } from 'lucide-react';
import { formatCurrency, formatPercent, isPago, pluralize } from '../utils/format';

function soma(lista) {
  return lista.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
}

export function SummarySkeleton() {
  return (
    <section className="summary" aria-busy="true" aria-label="Carregando resumo">
      <div className="card sum-card hero">
        <div className="skel" style={{ width: 120, height: 14 }} />
        <div className="skel" style={{ width: 220, height: 32 }} />
        <div className="skel skel-bar" />
        <div className="skel" style={{ width: '60%', height: 14 }} />
      </div>
      <div className="card sum-card">
        <div className="skel" style={{ width: 90, height: 14 }} />
        <div className="skel" style={{ width: 140, height: 24 }} />
      </div>
      <div className="card sum-card">
        <div className="skel" style={{ width: 90, height: 14 }} />
        <div className="skel" style={{ width: 140, height: 24 }} />
      </div>
    </section>
  );
}

// Resumo com hierarquia: o total em destaque, com a proporção pago/a pagar,
// e dois cards menores que também funcionam como atalho de filtro.
export default function SummaryCards({ despesas, onFilterStatus }) {
  const total = soma(despesas);
  const pagas = despesas.filter(isPago);
  const pendentes = despesas.filter((d) => !isPago(d));
  const totalPago = soma(pagas);
  const totalPendente = soma(pendentes);

  const fracPago = total > 0 ? totalPago / total : 0;
  const fracPendente = total > 0 ? totalPendente / total : 0;

  const maior = despesas.reduce((m, d) => (!m || Number(d.valor) > Number(m.valor) ? d : m), null);
  const media = despesas.length > 0 ? total / despesas.length : 0;

  return (
    <section className="summary" aria-label="Resumo">
      <article className="card sum-card hero">
        <h2 className="sum-label">Total registrado</h2>
        <span className="sum-value money">{formatCurrency(total)}</span>

        <div
          className="stack-bar"
          role="img"
          aria-label={`${formatPercent(fracPago)} pago, ${formatPercent(fracPendente)} a pagar`}
        >
          {fracPago > 0 && <span className="pos" style={{ width: `${fracPago * 100}%` }} />}
          {fracPendente > 0 && <span className="warn" style={{ width: `${fracPendente * 100}%` }} />}
        </div>

        <div className="legend">
          <span className="legend-item">
            <span className="dot pos" aria-hidden="true" />
            Pago <b className="money hide-sm">{formatCurrency(totalPago)}</b> ({formatPercent(fracPago)})
          </span>
          <span className="legend-item">
            <span className="dot warn" aria-hidden="true" />
            A pagar <b className="money hide-sm">{formatCurrency(totalPendente)}</b> ({formatPercent(fracPendente)})
          </span>
        </div>

        {maior && (
          <div className="sum-foot hide-sm">
            <span>
              Maior despesa: <b>{maior.descricao}</b> <b className="money">{formatCurrency(maior.valor)}</b>
            </span>
            <span>
              Média: <b className="money">{formatCurrency(media)}</b>
            </span>
          </div>
        )}
      </article>

      <article className="card sum-card">
        <h2 className="sum-label">
          <span className="icon-chip warn" aria-hidden="true"><Clock size={18} /></span>
          A pagar
        </h2>
        <span className="sum-value md money">{formatCurrency(totalPendente)}</span>
        <span className="sum-meta">{pluralize(pendentes.length, 'conta pendente', 'contas pendentes')}</span>
        {pendentes.length > 0 && (
          <button type="button" className="sum-link" onClick={() => onFilterStatus('pending')}>
            Ver pendentes
          </button>
        )}
      </article>

      <article className="card sum-card">
        <h2 className="sum-label">
          <span className="icon-chip pos" aria-hidden="true"><CircleCheck size={18} /></span>
          Pago
        </h2>
        <span className="sum-value md money">{formatCurrency(totalPago)}</span>
        <span className="sum-meta">{pluralize(pagas.length, 'despesa quitada', 'despesas quitadas')}</span>
        {pagas.length > 0 && (
          <button type="button" className="sum-link" onClick={() => onFilterStatus('paid')}>
            Ver pagas
          </button>
        )}
      </article>
    </section>
  );
}
