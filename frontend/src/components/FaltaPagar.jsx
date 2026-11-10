import React from 'react';
import { formatCurrency, isPago, pluralize } from '../utils/format';
import { rotuloMetodo } from '../utils/despesas';
import { StatusBadge } from './ExpenseList';

// Quantos canhotos aparecem na faixa antes do atalho "Ver todas".
const MAX_VISIVEIS = 5;

function soma(lista) {
  return lista.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
}

export function FaltaPagarSkeleton() {
  return (
    <section className="owed" aria-busy="true" aria-label="Carregando o que falta pagar">
      <div className="owed-head skel-stack">
        <div className="skel" style={{ width: 110, height: 16 }} />
        <div className="skel" style={{ width: 240, height: 52 }} />
        <div className="skel" style={{ width: 150, height: 16 }} />
      </div>
    </section>
  );
}

// Responde à primeira pergunta da tela: quanto falta pagar e quais contas somam esse valor.
// Sempre considera todas as despesas, sem os filtros da lista ao lado.
// A conta recém-paga (carimbadaId) fica na lista por um instante, já carimbada, e só então sai:
// quem pagou pelo celular vê o carimbo aqui, sem rolar até a lista.
export default function FaltaPagar({ despesas, carimbadaId, onFilterStatus, onTogglePaid, onOpenDetails }) {
  const pagas = despesas.filter(isPago);
  const pendentes = despesas
    .filter((d) => !isPago(d))
    .sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0));
  const naLista = despesas
    .filter((d) => !isPago(d) || d.id === carimbadaId)
    .sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0));
  const visiveis = naLista.slice(0, MAX_VISIVEIS);

  return (
    <section className="owed" aria-labelledby="falta-titulo">
      <div className="owed-head">
        <h2 id="falta-titulo" className="caps">Falta pagar</h2>
        <p className="owed-total money">{formatCurrency(soma(pendentes))}</p>
        <p className="owed-sub">
          {pendentes.length > 0
            ? pluralize(pendentes.length, 'conta pendente', 'contas pendentes')
            : 'Nenhuma conta pendente.'}
        </p>

        <dl className="owed-foot">
          <div>
            <dt>Já pago ({pluralize(pagas.length, 'despesa', 'despesas')})</dt>
            <dd className="money">{formatCurrency(soma(pagas))}</dd>
            {pagas.length > 0 && (
              <button type="button" className="link-btn" onClick={() => onFilterStatus('paid')}>
                Ver pagas
              </button>
            )}
          </div>
          <div>
            <dt>Total registrado</dt>
            <dd className="money">{formatCurrency(soma(despesas))}</dd>
          </div>
        </dl>
      </div>

      {/* Faixa de canhotos: cada conta pendente ao lado do total. Rola para o lado
          quando não cabe (no celular, com o polegar; o próximo canhoto fica à vista). */}
      {visiveis.length > 0 && (
        <ul className="coupons" aria-label="Contas pendentes">
          {visiveis.map((item) => (
            <li key={item.id} className={`coupon ${isPago(item) ? 'is-stamped' : ''}`}>
              <button type="button" className="coupon-name" onClick={() => onOpenDetails(item)}>
                {item.descricao}
              </button>
              <span className="coupon-val money">{formatCurrency(item.valor)}</span>
              <span className="coupon-meta">
                {item.categoria || 'Sem categoria'} · {rotuloMetodo(item.metodoPagamento)}
              </span>
              {isPago(item) ? (
                <span className="coupon-stamp"><StatusBadge despesa={item} fresh /></span>
              ) : (
                <button type="button" className="link-btn" onClick={() => onTogglePaid(item)}>
                  Marcar como pago
                  <span className="sr-only">: {item.descricao}</span>
                </button>
              )}
            </li>
          ))}

          {pendentes.length > MAX_VISIVEIS && (
            <li className="coupon coupon-more">
              <button type="button" className="link-btn" onClick={() => onFilterStatus('pending')}>
                Ver todas as {pendentes.length} pendentes
              </button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
