import React, { useRef } from 'react';
import { X, CircleCheck, Clock, Pencil, Trash2 } from 'lucide-react';
import useDialog from '../hooks/useDialog';
import { StatusBadge, CategoryDot } from './ExpenseList';
import { formatCurrency, formatParcelas, isPago } from '../utils/format';

// Abre com o item que já está na lista: não precisa de GET /despesas/:id.
export default function ExpenseDetailsModal({ expense, categorias, onClose, onEdit, onDelete, onTogglePaid }) {
  const dialogRef = useRef(null);
  const acaoPrincipalRef = useRef(null);
  useDialog({ dialogRef, initialFocusRef: acaoPrincipalRef, onClose });

  const pago = isPago(expense);

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal modal-sm"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalhes-titulo"
      >
        <div className="sheet-grip" aria-hidden="true" />
        <div className="modal-head">
          <h2 id="detalhes-titulo">{expense.descricao}</h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-hero">
            <span className="detail-value money">{formatCurrency(expense.valor)}</span>
            <StatusBadge despesa={expense} />
          </div>

          <dl className="dl">
            <dt>Categoria</dt>
            <dd>
              <span className="cat">
                <CategoryDot nome={expense.categoria} categorias={categorias} />
                {expense.categoria || 'Sem categoria'}
              </span>
            </dd>
            <dt>Forma de pagamento</dt>
            <dd>{expense.metodoPagamento || 'Não informado'}</dd>
            <dt>Parcelas</dt>
            <dd className="money">{formatParcelas(expense.parcelas, expense.valor)}</dd>
          </dl>

          {/* Um único botão (e não dois alternados) para o foco não se perder ao trocar o status. */}
          <button
            ref={acaoPrincipalRef}
            type="button"
            className={`btn full-width ${pago ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => onTogglePaid(expense)}
          >
            {pago ? <Clock size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
            {pago ? 'Marcar como pendente' : 'Marcar como pago'}
          </button>
        </div>

        <div className="modal-foot between">
          <button type="button" className="btn btn-ghost text-danger" onClick={() => onDelete(expense)}>
            <Trash2 size={18} aria-hidden="true" />
            Excluir
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onEdit(expense)}>
            <Pencil size={18} aria-hidden="true" />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}
