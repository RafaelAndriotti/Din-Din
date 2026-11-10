// Aplica o tema antes do primeiro desenho. Mesma regra de src/hooks/useTema.js.
// Fica em arquivo separado (e não inline no index.html) para a CSP poder
// proibir scripts inline: script-src 'self'.
(function () {
  var tema = null;
  try { tema = localStorage.getItem('din-din-tema'); } catch { /* sem armazenamento: segue o tema do sistema */ }
  if (tema !== 'dark' && tema !== 'light') {
    tema = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = tema;
})();
