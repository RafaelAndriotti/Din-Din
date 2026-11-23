import { describe, it, expect } from 'vitest';
import { lerConfig } from '../src/config.js';

// Um .env completo e válido; cada caso altera uma variável.
const valido = {
    POSTGRES_USER: 'admin_local',
    POSTGRES_PASSWORD: 'uma-senha-forte-do-admin',
    POSTGRES_DB: 'din_din_db',
    APP_DB_USER: 'din_din_app',
    APP_DB_PASSWORD: 'uma-senha-forte-da-api',
    JWT_SECRET: 'x'.repeat(43)
};

describe('Configuração validada no boot (F13)', () => {
    it('aceita um .env válido e completa os padrões', () => {
        const config = lerConfig(valido);

        expect(config.POSTGRES_HOST).toBe('127.0.0.1');
        expect(config.POSTGRES_PORT).toBe(5434);
        expect(config.PORT).toBe(3000);
    });

    it.each([
        ['o .env.example copiado sem editar', { POSTGRES_USER: 'seu_usuario_aqui', POSTGRES_PASSWORD: 'sua_senha_aqui', APP_DB_PASSWORD: 'senha_da_api_aqui', JWT_SECRET: 'segredo_do_jwt_aqui' }, 'POSTGRES_USER'],
        ['senha do admin ainda de exemplo', { POSTGRES_PASSWORD: 'sua_senha_aqui' }, 'POSTGRES_PASSWORD'],
        ['senha do admin ausente', { POSTGRES_PASSWORD: undefined }, 'POSTGRES_PASSWORD'],
        ['senha do admin curta', { POSTGRES_PASSWORD: 'curta' }, 'POSTGRES_PASSWORD'],
        ['senha da API ausente', { APP_DB_PASSWORD: undefined }, 'APP_DB_PASSWORD'],
        ['senha da API com 11 caracteres', { APP_DB_PASSWORD: 'a'.repeat(11) }, 'APP_DB_PASSWORD'],
        ['JWT_SECRET ausente', { JWT_SECRET: undefined }, 'JWT_SECRET'],
        ['JWT_SECRET com 31 caracteres', { JWT_SECRET: 'x'.repeat(31) }, 'JWT_SECRET'],
        ['API conectando como o admin', { APP_DB_USER: 'admin_local' }, 'APP_DB_USER']
    ])('recusa %s e diz qual variável', (_, alteracao, variavel) => {
        expect(() => lerConfig({ ...valido, ...alteracao })).toThrow(variavel);
    });

    it('a mensagem de erro nunca mostra o valor da variável', () => {
        const segredoCurto = 'segredo-curto-123';

        expect(() => lerConfig({ ...valido, JWT_SECRET: segredoCurto })).toThrow(/JWT_SECRET/);
        expect(() => lerConfig({ ...valido, JWT_SECRET: segredoCurto })).not.toThrow(new RegExp(segredoCurto));
    });
});
