import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Content-Security-Policy do build de produção.
// Só entra no build: em dev o Vite injeta scripts inline (HMR/React Refresh) que a CSP bloquearia.
// 'unsafe-inline' em style-src é necessário por causa dos atributos style do React.
// frame-ancestors, HSTS e X-Content-Type-Options não funcionam em <meta>:
// precisam vir como cabeçalho HTTP do servidor que hospedar o site.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ')

const cspNoBuild = () => ({
  name: 'csp-no-build',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }
  ]
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cspNoBuild()],
  build: {
    // Sem source maps em produção: não publica o código-fonte original junto do bundle.
    sourcemap: false
  },
  server: {
    port: 5173,
    proxy: {
      '/despesas': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/categorias': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
