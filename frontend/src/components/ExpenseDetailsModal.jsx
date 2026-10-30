import React from 'react';
import { X, Calendar, DollarSign, Tag, CreditCard, Layers, CheckCircle2, Clock } from 'lucide-react';

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val || 0);
}

export default function ExpenseDetailsModal({ expense, isOpen, onClose }) {
  if (!isOpen || !expense) return null;

  const isPaid = String(expense.status).toLowerCase() === 'pago';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="details-header-title">
            <span className="details-id-tag">ID #{expense.id}</span>
            <h3>{expense.descricao}</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="details-body">
          <div className="details-highlight-card">
            <span className="details-highlight-label">Valor Total</span>
            <span className="details-highlight-value">{formatCurrency(expense.valor)}</span>
            <div className={`status-badge large ${isPaid ? 'paid' : 'pending'}`}>
              {isPaid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
              <span>{isPaid ? 'Pago' : 'Pendente'}</span>
            </div>
          </div>

          <div className="details-grid">
            <div className="details-item">
              <div className="details-item-icon">
                <Tag size={18} />
              </div>
              <div className="details-item-content">
                <span className="details-item-label">Categoria</span>
                <span className="details-item-value">{expense.categoria || 'Geral'}</span>
              </div>
            </div>

            <div className="details-item">
              <div className="details-item-icon">
                <CreditCard size={18} />
              </div>
              <div className="details-item-content">
                <span className="details-item-label">Forma de Pagamento</span>
                <span className="details-item-value">{expense.metodoPagamento || 'Não informado'}</span>
              </div>
            </div>

            <div className="details-item">
              <div className="details-item-icon">
                <Layers size={18} />
              </div>
              <div className="details-item-content">
                <span className="details-item-label">Parcelas</span>
                <span className="details-item-value">
                  {expense.parcelas > 0 ? `${expense.parcelas}x parcelado` : 'À vista (0)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary full-width" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
