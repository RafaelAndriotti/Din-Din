import React from 'react';
import { DollarSign, CheckCircle2, Clock, Receipt, TrendingDown } from 'lucide-react';

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val || 0);
}

export default function MetricsCards({ despesas }) {
  const total = despesas.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  
  const pagas = despesas.filter(d => String(d.status).toLowerCase() === 'pago');
  const totalPagas = pagas.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  
  const pendentes = despesas.filter(d => String(d.status).toLowerCase() !== 'pago');
  const totalPendentes = pendentes.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  const totalCount = despesas.length;

  return (
    <div className="metrics-grid">
      {/* Card Total Geral */}
      <div className="metric-card card-total">
        <div className="card-header">
          <span className="card-title">Total de Despesas</span>
          <div className="card-icon-badge total">
            <TrendingDown size={20} />
          </div>
        </div>
        <div className="card-body">
          <div className="card-value">{formatCurrency(total)}</div>
          <span className="card-subtitle">{totalCount} {totalCount === 1 ? 'registro' : 'registros'} cadastrados</span>
        </div>
      </div>

      {/* Card Pagas */}
      <div className="metric-card card-paid">
        <div className="card-header">
          <span className="card-title">Despesas Pagas</span>
          <div className="card-icon-badge paid">
            <CheckCircle2 size={20} />
          </div>
        </div>
        <div className="card-body">
          <div className="card-value">{formatCurrency(totalPagas)}</div>
          <span className="card-subtitle">{pagas.length} {pagas.length === 1 ? 'despesa quitada' : 'despesas quitadas'}</span>
        </div>
      </div>

      {/* Card Pendentes */}
      <div className="metric-card card-pending">
        <div className="card-header">
          <span className="card-title">Despesas Pendentes</span>
          <div className="card-icon-badge pending">
            <Clock size={20} />
          </div>
        </div>
        <div className="card-body">
          <div className="card-value">{formatCurrency(totalPendentes)}</div>
          <span className="card-subtitle">{pendentes.length} {pendentes.length === 1 ? 'pendência a pagar' : 'pendências a pagar'}</span>
        </div>
      </div>

      {/* Card Média / Resumo */}
      <div className="metric-card card-average">
        <div className="card-header">
          <span className="card-title">Ticket Médio</span>
          <div className="card-icon-badge average">
            <Receipt size={20} />
          </div>
        </div>
        <div className="card-body">
          <div className="card-value">{formatCurrency(totalCount > 0 ? total / totalCount : 0)}</div>
          <span className="card-subtitle">Valor médio por despesa</span>
        </div>
      </div>
    </div>
  );
}
