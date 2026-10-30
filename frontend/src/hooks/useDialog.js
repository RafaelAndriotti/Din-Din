import { useEffect, useRef } from 'react';

const FOCAVEIS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

// Comportamento de modal acessível:
// - Esc fecha;
// - Tab e Shift+Tab ficam presos dentro do modal;
// - foco inicial no elemento indicado (ou no primeiro focável);
// - ao fechar, o foco volta para quem abriu (ou para um fallback, se ele sumiu);
// - a página de fundo não rola enquanto o modal está aberto.
export default function useDialog({ dialogRef, initialFocusRef, onClose, fallbackFocusId = 'lista-titulo' }) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement;
    const dialog = dialogRef.current;
    const alvoInicial = initialFocusRef?.current || dialog?.querySelector(FOCAVEIS) || dialog;
    alvoInicial?.focus();

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;

      const focaveis = Array.from(dialog.querySelectorAll(FOCAVEIS)).filter((el) => el.offsetParent !== null);
      if (focaveis.length === 0) {
        e.preventDefault();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (e.shiftKey && (document.activeElement === primeiro || !dialog.contains(document.activeElement))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    }

    dialog?.addEventListener('keydown', handleKeyDown);

    return () => {
      dialog?.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflowAnterior;

      if (opener && opener.isConnected && typeof opener.focus === 'function') {
        opener.focus();
      } else {
        document.getElementById(fallbackFocusId)?.focus();
      }
    };
    // Refs e id são estáveis: na prática roda uma vez por abertura,
    // porque o componente do modal só é montado quando está aberto.
  }, [dialogRef, initialFocusRef, fallbackFocusId]);
}
