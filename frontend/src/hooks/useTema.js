import { useCallback, useEffect, useState } from 'react';

// Mesma chave usada pelo script em index.html, que aplica o tema antes do
// primeiro desenho da página (evita piscar o modo claro ao abrir à noite).
const CHAVE = 'din-din-tema';
const consulta = '(prefers-color-scheme: dark)';

function lerSalvo() {
  try {
    const valor = localStorage.getItem(CHAVE);
    return valor === 'dark' || valor === 'light' ? valor : null;
  } catch {
    return null;
  }
}

function doSistema() {
  return window.matchMedia?.(consulta).matches ? 'dark' : 'light';
}

/**
 * Tema da interface: 'light' ou 'dark'.
 * Sem escolha salva, segue o sistema (e acompanha se ele mudar).
 * Depois que a pessoa alterna, a escolha fica salva neste navegador.
 */
export default function useTema() {
  const [salvo, setSalvo] = useState(lerSalvo);
  const [sistema, setSistema] = useState(doSistema);
  const tema = salvo ?? sistema;

  useEffect(() => {
    const mq = window.matchMedia?.(consulta);
    if (!mq) return undefined;
    const aoMudar = (e) => setSistema(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = tema;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', tema === 'dark' ? '#141519' : '#14285A');
  }, [tema]);

  const alternar = useCallback(() => {
    const proximo = tema === 'dark' ? 'light' : 'dark';
    setSalvo(proximo);
    try {
      localStorage.setItem(CHAVE, proximo);
    } catch {
      // Sem armazenamento (aba anônima, bloqueio): vale só para esta visita.
    }
  }, [tema]);

  return { tema, alternar };
}
