import { useEffect, useState } from 'react';

// Só fica true depois que "active" passa "delay" ms ligado.
// Evita o flash do skeleton quando a API responde rápido.
export default function useDelayedFlag(active, delay = 300) {
  const [visible, setVisible] = useState(false);
  const [anterior, setAnterior] = useState(active);

  // Quando "active" desliga, zera durante o render (sem setState dentro do effect).
  if (active !== anterior) {
    setAnterior(active);
    if (!active) setVisible(false);
  }

  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);

  return active && visible;
}
