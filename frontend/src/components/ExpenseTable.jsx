import React from 'react';
import { Tag, CreditCard, CheckCircle2, Clock, Eye, AlertCircle, Receipt } from 'lucide-react';

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val || 0);
}

export default function ExpenseTable({ despesas, onSelectExpense, onOpenNewModal }) {
  if (despesas.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon-wrapper">
          <Receipt size={42} />
        </div>
        <h4>Nenhuma despesa encontrada</h4>
        <p>Não há lançamentos que correspondam aos filtros selecionados.</p>
        <button type="button" className="btn btn-primary" onClick={onOpenNewModal}>
          Cadastrar Primeira Despesa
        </button>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="expenses-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Forma de Pagto</th>
            <th>Parcelas</th>
            <th>Status</th>
            <th className="text-right">Valor</th>
            <th className="text-center">Ações</th>
          </tr>
        </thead>
        <tbody>
          {despesas.map((item) => {
            const isPaid = String(item.status).toLowerCase() === 'paid';
            return (
              <tr 
                key={item.id} 
                onClick={() => onSelectExpense(item)}
                className="expense-row"
              >
                <td className="font-semibold cell-desc">
                  <div className="desc-text">{item.desc}</div>
                  <span className="desc-id">ID: #{item.id}</span>
                </td>
                <td>
                  <span className="badge category-badge">
                    <Tag size={12} />
                    {item.category || 'Geral'}
                  </span>
                </td>
                <td>
                  <span className="badge payment-badge">
                    <CreditCard size={12} />
                    {item.payMethod || 'Padrão'}
                  </span>
                </td>
                <td className="cell-installments">
                  {item.installment > 0 ? `${item.installment}x` : 'À vista'}
                </td>
                <td>
                  <span className={`status-badge ${isPaid ? 'paid' : 'pending'}`}>
                    {isPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    {isPaid ? 'Pago' : 'Pendente'}
                  </span>
                </td>
                <td className="text-right font-bold cell-value">
                  {formatCurrency(item.value)}
                </td>
                <td className="text-center cell-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button" 
                    className="action-btn"
                    onClick={() => onSelectExpense(item)}
                    title="Ver Detalhes (GET /despesas/:id)"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
