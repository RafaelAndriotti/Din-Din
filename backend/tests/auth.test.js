import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { conferirSenha, gerarHash } from '../src/auth/senha.js';
import { lerToken } from '../src/auth/token.js';
import pool from '../src/db/db.js';

vi.mock('../src/db/db.js', () => ({
    default: { query: vi.fn() }
}));

describe('Hash de senha (scrypt)', () => {
    it('confere a senha certa e recusa a errada', async () => {
        const hash = await gerarHash('senha-correta-123');

        expect(await conferirSenha('senha-correta-123', hash)).toBe(true);
        expect(await conferirSenha('senha-errada-123', hash)).toBe(false);
    });

    it('não guarda a senha e usa um sal novo a cada hash', async () => {
        const [a, b] = await Promise.all([gerarHash('mesma-senha-123'), gerarHash('mesma-senha-123')]);

        expect(a).toMatch(/^scrypt\$32768\$8\$3\$/);
        expect(a).not.toContain('mesma-senha-123');
        expect(a).not.toBe(b);
    });
});

describe('POST /auth/registro', () => {
    let app;

    beforeEach(() => {
        vi.resetAllMocks();
        app = criarApp();
    });

    it('cria a conta com e-mail normalizado e hash, e devolve um token do novo usuário', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 3, email: 'ana@exemplo.com' }] });

        const response = await request(app).post('/auth/registro').send({ email: '  Ana@Exemplo.COM ', senha: 'senha-forte-123' });

        expect(response.status).toBe(201);
        expect(response.body.usuario).toEqual({ id: 3, email: 'ana@exemplo.com' });
        expect(lerToken(response.body.token)).toBe(3);
        const [email, hash] = pool.query.mock.calls[0][1];
        expect(email).toBe('ana@exemplo.com');
        expect(hash).toMatch(/^scrypt\$/);
        expect(hash).not.toContain('senha-forte-123');
    });

    it('e-mail já cadastrado responde 409', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] }); // ON CONFLICT DO NOTHING

        const response = await request(app).post('/auth/registro').send({ email: 'ana@exemplo.com', senha: 'senha-forte-123' });

        expect(response.status).toBe(409);
        expect(response.body).not.toHaveProperty('token');
    });

    it.each([
        ['senha curta', { email: 'ana@exemplo.com', senha: '1234567' }],
        ['senha longa demais', { email: 'ana@exemplo.com', senha: 'a'.repeat(129) }],
        ['e-mail inválido', { email: 'ana', senha: 'senha-forte-123' }],
        ['sem senha', { email: 'ana@exemplo.com' }]
    ])('%s responde 400 sem consultar o banco', async (_, corpo) => {
        const response = await request(app).post('/auth/registro').send(corpo);

        expect(response.status).toBe(400);
        expect(pool.query).not.toHaveBeenCalled();
    });
});

describe('POST /auth/login', () => {
    let app;
    let hashDaAna;

    beforeAll(async () => {
        hashDaAna = await gerarHash('senha-da-ana-123');
    });

    beforeEach(() => {
        vi.resetAllMocks();
        app = criarApp();
    });

    it('senha certa devolve 200 e um token do usuário', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 3, email: 'ana@exemplo.com', senha_hash: hashDaAna }] });

        const response = await request(app).post('/auth/login').send({ email: 'ANA@exemplo.com', senha: 'senha-da-ana-123' });

        expect(response.status).toBe(200);
        expect(lerToken(response.body.token)).toBe(3);
        expect(response.body.usuario).toEqual({ id: 3, email: 'ana@exemplo.com' });
        expect(pool.query.mock.calls[0][1]).toEqual(['ana@exemplo.com']);
    });

    it('senha errada e e-mail inexistente recebem a mesma resposta 401', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 3, email: 'ana@exemplo.com', senha_hash: hashDaAna }] });
        const senhaErrada = await request(app).post('/auth/login').send({ email: 'ana@exemplo.com', senha: 'outra-senha-123' });

        pool.query.mockResolvedValueOnce({ rows: [] });
        const semConta = await request(app).post('/auth/login').send({ email: 'ninguem@exemplo.com', senha: 'outra-senha-123' });

        expect(senhaErrada.status).toBe(401);
        expect(semConta.status).toBe(401);
        expect(senhaErrada.body).toEqual(semConta.body);
        expect(senhaErrada.body).not.toHaveProperty('token');
    });
});
