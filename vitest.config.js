import { defineConfig } from 'vitest/config';

// Os testes não leem o .env: usam estes valores falsos, que passam na validação do config.js.
export default defineConfig({
    test: {
        env: {
            POSTGRES_USER: 'admin_dos_testes',
            POSTGRES_PASSWORD: 'senha-do-admin-dos-testes',
            POSTGRES_DB: 'din_din_testes',
            APP_DB_USER: 'din_din_app',
            APP_DB_PASSWORD: 'senha-da-api-dos-testes',
            JWT_SECRET: 'segredo-dos-testes-com-mais-de-32-caracteres'
        }
    }
});
