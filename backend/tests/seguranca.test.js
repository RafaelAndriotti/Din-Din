import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { criarApp } from '../src/app.js';
import { emitirToken } from '../src/auth/token.js';
import pool from '../src/db/db.js';

vi.mock('../src/db/db.js', () => ({
    default: { query: vi.fn() }
}));

const SEGREDO = process.env.JWT_SECRET;
const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

// Todas as rotas de dados. Só /auth/* e GET / são públicas.
const ROTAS = [
    ['get', '/despesas'], ['post', '/despesas'], ['get', '/despesas/1'], ['put', '/despesas/1'], ['delete', '/despesas/1'],
    ['get', '/categorias'], ['post', '/categorias'], ['get', '/categorias/1'], ['put', '/categorias/1'], ['delete', '/categorias/1']
];

describe('Autenticação obrigatória (F01)', () => {
    let app;

    beforeEach(() => {
        vi.resetAllMocks();
        app = criarApp();
    });

    it.each(ROTAS)('%s %s sem token responde 401 sem consultar o banco', async (metodo, rota) => {
        const response = await request(app)[metodo](rota).send({});

        expect(response.status).toBe(401);
        expect(response.headers['www-authenticate']).toBe('Bearer');
        expect(pool.query).not.toHaveBeenCalled();
    });

    it.each([
        ['assinado com outro segredo', () => jwt.sign({}, 'outro-segredo-com-mais-de-32-caracteres!', { subject: '7' })],
        ['vencido', () => jwt.sign({ exp: Math.floor(Date.now() / 1000) - 60 }, SEGREDO, { subject: '7' })],
        ['com "alg": "none"', () => `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({ sub: '7' })}.`],
        ['sem sub', () => jwt.sign({}, SEGREDO)],
        ['malformado', () => 'abc.def.ghi']
    ])('token %s responde 401', async (_, gerarToken) => {
        const response = await request(app).get('/despesas').set('Authorization', `Bearer ${gerarToken()}`);

        expect(response.status).toBe(401);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('token sem o prefixo Bearer responde 401', async () => {
        const response = await request(app).get('/despesas').set('Authorization', emitirToken(7));

        expect(response.status).toBe(401);
    });

    it('GET / continua público', async () => {
        const response = await request(app).get('/');

        expect(response.status).toBe(200);
    });
});

describe('Respostas de erro (O1, O2)', () => {
    let app;
    const auth = { Authorization: `Bearer ${emitirToken(7)}` };

    beforeEach(() => {
        vi.resetAllMocks();
        app = criarApp();
    });

    it('JSON malformado responde 400 em JSON, sem stack trace', async () => {
        const response = await request(app)
            .post('/despesas')
            .set(auth)
            .set('Content-Type', 'application/json')
            .send('<img src=x onerror=alert(1)>');

        expect(response.status).toBe(400);
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(response.body).toEqual({ message: 'JSON inválido.' });
        expect(response.text).not.toMatch(/node_modules|SyntaxError|at /);
    });

    it('erro do banco responde 500 genérico; a mensagem fica só no log do servidor', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {});
        pool.query.mockRejectedValueOnce(new Error('numeric field overflow na constraint despesas_pkey'));

        const response = await request(app).get('/despesas').set(auth);

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ message: 'Erro interno do servidor' });
        expect(response.text).not.toContain('overflow');
        expect(log).toHaveBeenCalled();
    });

    it('as respostas não anunciam o framework (X-Powered-By)', async () => {
        const response = await request(app).get('/');

        expect(response.headers['x-powered-by']).toBeUndefined();
    });
});
