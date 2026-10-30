import React, { useCallback, useEffect, useRef } from 'react';
import { CircleCheck, CircleAlert, X } from 'lucide-react';

// Aviso temporário. O timer pausa com o mouse em cima ou com o foco dentro,
// para dar tempo de ler e de clicar em "Desfazer" ou "Tentar de novo".
// onClose(id, motivo): motivo é 'timeout', 'dismiss' ou 'action'.
function ToastItem({ toast, onClose }) {
  const timerRef = useRef(null);
  const restanteRef = useRef(toast.duration);
  const inicioRef = useRef(0);

  const iniciar = useCallback(() => {
    clearTimeout(timerRef.current);
    inicioRef.current = Date.now();
    timerRef.current = setTimeout(() => onClose(toast.id, 'timeout'), restanteRef.current);
  }, [onClose, toast.id]);

  const pausar = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    restanteRef.current = Math.max(1000, restanteRef.current - (Date.now() - inicioRef.current));
  }, []);

  useEffect(() => {
    iniciar();
    return () => clearTimeout(timerRef.current);
  }, [iniciar]);

  function handleBlur(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) iniciar();
  }

  const isError = toast.variant === 'error';
  const Icone = isError ? CircleAlert : CircleCheck;

  return (
    <div
      className={`toast ${isError ? 'toast-error' : ''}`}
      role={isError ? 'alert' : 'status'}
      onMouseEnter={pausar}
      onMouseLeave={iniciar}
      onFocus={pausar}
      onBlur={handleBlur}
    >
      <Icone size={18} className="toast-icon" aria-hidden="true" />
      <span className="toast-message">{toast.message}</span>
      {toast.actionLabel && (
        <button type="button" className="toast-action" onClick={() => onClose(toast.id, 'action')}>
          {toast.actionLabel}
        </button>
      )}
      <button type="button" className="icon-btn sm" aria-label="Fechar aviso" onClick={() => onClose(toast.id, 'dismiss')}>
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Toast({ toast, onClose }) {
  return (
    <div className="toast-region" aria-live="polite">
      {toast && <ToastItem key={toast.id} toast={toast} onClose={onClose} />}
    </div>
  );
}
