import React, { useState } from 'react';
import { X, DollarSign, Calendar, CreditCard, Tag, AlertCircle } from 'lucide-react';

const CATEGORIAS_PREDEFINIDAS = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Lazer',
  'Educação',
  'Tecnologia',
  'Compras',
  'Outros'
];

const METODOS_PAGAMENTO = [
  'PIX',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto',
  'Dinheiro',
  'Transferência'
];

export default function ExpenseModal({ isOpen, onClose, onSave }) {
  const [desc, setDesc] = useState('');
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [customCategory, setCustomCategory] = useState('');
  const [payMethod, setPayMethod] = useState('PIX');
  const [installment, setInstallment] = useState(0);
  const [status, setStatus] = useState('pago');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!desc.trim()) {
      setError('Por favor, informe a descrição da despesa.');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setError('Por favor, informe um valor numérico válido maior que zero.');
      return;
    }

    const finalCategory = category === 'Outros' && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    const payload = {
      descricao: desc.trim(),
      valor: numValue,
      categoria: finalCategory,
      metodoPagamento: payMethod,
      parcelas: parseInt(installment, 10) || 0,
      status
    };

    setSubmitting(true);
    try {
      await onSave(payload);
      // Reset form
      setDesc('');
      setValue('');
      setCategory('Alimentação');
      setCustomCategory('');
      setPayMethod('PIX');
      setInstallment(0);
      setStatus('pago');
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar despesa');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nova Despesa</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="modal-alert error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Descrição */}
          <div className="form-group">
            <label htmlFor="desc">Descrição *</label>
            <input
              id="desc"
              type="text"
              placeholder="Ex: Aluguel do mês, Supermercado..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
              autoFocus
              className="form-input"
            />
          </div>

          {/* Valor */}
          <div className="form-group">
            <label htmlFor="value">Valor (R$) *</label>
            <div className="input-with-icon">
              <span className="input-prefix">R$</span>
              <input
                id="value"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            {/* Categoria */}
            <div className="form-group">
              <label htmlFor="category">Categoria</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-select"
              >
                {CATEGORIAS_PREDEFINIDAS.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Método de Pagamento */}
            <div className="form-group">
              <label htmlFor="payMethod">Forma de Pagamento</label>
              <select
                id="payMethod"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="form-select"
              >
                {METODOS_PAGAMENTO.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
          </div>

          {category === 'Outros' && (
            <div className="form-group">
              <label htmlFor="customCategory">Nome da Categoria Customizada</label>
              <input
                id="customCategory"
                type="text"
                placeholder="Ex: Assinaturas de Streaming"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="form-input"
              />
            </div>
          )}

          <div className="form-row">
            {/* Parcelas */}
            <div className="form-group">
              <label htmlFor="installment">Parcelas (0 = à vista)</label>
              <input
                id="installment"
                type="number"
                min="0"
                max="48"
                value={installment}
                onChange={(e) => setInstallment(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <div className="status-radio-group">
                <label className={`radio-pill ${status === 'pago' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value="pago"
                    checked={status === 'pago'}
                    onChange={() => setStatus('pago')}
                  />
                  Pago
                </label>
                <label className={`radio-pill ${status === 'pendente' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value="pendente"
                    checked={status === 'pendente'}
                    onChange={() => setStatus('pendente')}
                  />
                  Pendente
                </label>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose} 
              disabled={submitting}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={submitting}
            >
              {submitting ? 'Salvando...' : 'Cadastrar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
