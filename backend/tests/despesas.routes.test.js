import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { emitirToken } from '../src/auth/token.js';
import pool from '../src/db/db.js';

vi.mock('../src/db/db.js', () => ({
    default: { query: vi.fn() }
}));

// Dono das requisições destes testes.
const DONO = 7;
const auth = { Authorization: `Bearer ${emitirToken(DONO)}` };

describe('Rotas de Despesas - validacao do :id (COR-3)', () => {
    let app;
    const corpoValido = { descricao: 'Mercado', categoria: 'Alimentacao', status: 'PAGO', valor: 150.9, metodoPagamento: 'PIX' };

    beforeEach(() => {
        vi.resetAllMocks();
        app = criarApp();
    });

    describe.each([
        ['GET', 'get'],
        ['PUT', 'put'],
        ['DELETE', 'delete']
    ])('%s /despesas/:id', (_, metodo) => {
        it.each(['abc', '0', '-1', '1.5', '99999999999'])('id %s retorna 400 sem consultar o banco', async (id) => {
            const response = await request(app)[metodo]('/despesas/' + id).set(auth).send(corpoValido);

            expect(response.status).toBe(400);
            expect(Array.isArray(response.body.erros)).toBe(true);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('id valido passa o id como numero e o dono para o banco', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

            const response = await request(app)[metodo]('/despesas/1').set(auth).send(corpoValido);

            expect(response.status).toBe(metodo === 'delete' ? 204 : 200);
            expect(pool.query.mock.calls[0][0]).toMatch(/WHERE id = \$\d+ AND usuario_id = \$\d+/);
            expect(pool.query.mock.calls[0][1].slice(-2)).toEqual([1, DONO]);
        });

        // IDOR (F07-F09): despesa de outro dono volta 404, igual a um id inexistente.
        it('id de outro dono retorna 404', async () => {
            pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)[metodo]('/despesas/1').set(auth).send(corpoValido);

            expect(response.status).toBe(404);
        });
    });

    it('PUT com id valido e body invalido retorna 400 sem consultar o banco', async () => {
        const response = await request(app).put('/despesas/1').set(auth).send({ descricao: '' });

        expect(response.status).toBe(400);
        expect(Array.isArray(response.body.erros)).toBe(true);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('POST com body invalido retorna 400 sem consultar o banco', async () => {
        const response = await request(app).post('/despesas').set(auth).send({ descricao: '' });

        expect(response.status).toBe(400);
        expect(Array.isArray(response.body.erros)).toBe(true);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('POST valido de despesa PIX grava parcelas 1 e o dono do token', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const response = await request(app).post('/despesas').set(auth).send({ ...corpoValido, parcelas: 5 });

        expect(response.status).toBe(201);
        expect(pool.query.mock.calls[0][1]).toEqual([
            'Mercado', ['150.90'], 'Alimentacao', 'PIX', 1, 'PAGO', 'SAIDA', null, DONO
        ]);
    });

    it('POST ignora usuario_id vindo do body', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

        await request(app).post('/despesas').set(auth).send({ ...corpoValido, usuario_id: 99, usuarioId: 99 });

        expect(pool.query.mock.calls[0][1].at(-1)).toBe(DONO);
    });
});

describe('GET /despesas - dono e paginação (F02, O4)', () => {
    let app;

    beforeEach(() => {
        vi.resetAllMocks();
        app = criarApp();
    });

    it('lista só as despesas do dono, 50 por página por padrão', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app).get('/despesas').set(auth);

        expect(response.status).toBe(200);
        const [sql, params] = pool.query.mock.calls[0];
        expect(sql).toMatch(/FROM despesas\s+WHERE usuario_id = \$1/);
        expect(sql).toMatch(/LIMIT \$2 OFFSET \$3/);
        expect(params).toEqual([DONO, 50, 0, null]);
    });

    it('?pagina=3&limite=20 pula as 40 primeiras', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        await request(app).get('/despesas?pagina=3&limite=20').set(auth);

        expect(pool.query.mock.calls[0][1]).toEqual([DONO, 20, 40, null]);
    });

    it('?mes=2026-11 filtra pelo mês', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        await request(app).get('/despesas?mes=2026-11').set(auth);

        const [sql, params] = pool.query.mock.calls[0];
        expect(sql).toMatch(/mes = to_date\(\$4, 'YYYY-MM'\)/);
        expect(params).toEqual([DONO, 50, 0, '2026-11']);
    });

    it.each(['limite=101', 'limite=0', 'pagina=0', 'pagina=abc', 'mes=2026-13', 'mes=11-2026', "mes=2026-11'--"])('?%s retorna 400 sem consultar o banco', async (query) => {
        const response = await request(app).get(`/despesas?${query}`).set(auth);

        expect(response.status).toBe(400);
        expect(pool.query).not.toHaveBeenCalled();
    });
});

describe('Meses, entradas e parcelas', () => {
    let app;
    const saida = { descricao: 'Notebook', categoria: 'Tecnologia', status: 'PAGO', valor: 100, metodoPagamento: 'CREDITO', parcelas: 3, mes: '2026-11' };

    beforeEach(() => {
        vi.resetAllMocks();
        app = criarApp();
    });

    it('POST parcelado manda uma parcela por mês, sem perder centavo', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 2, parcelaAtual: 2 }, { id: 1, parcelaAtual: 1 }] });

        const response = await request(app).post('/despesas').set(auth).send(saida);

        expect(response.status).toBe(201);
        // Responde com a parcela do mês escolhido, não com a última gravada.
        expect(response.body.id).toBe(1);
        const params = pool.query.mock.calls[0][1];
        expect(params[1]).toEqual(['33.34', '33.33', '33.33']);
        expect(params.slice(4)).toEqual([3, 'PAGO', 'SAIDA', '2026-11', DONO]);
    });

    it('POST de entrada grava sem forma de pagamento e com 1 parcela', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const response = await request(app).post('/despesas').set(auth)
            .send({ tipo: 'ENTRADA', descricao: 'Salário', categoria: 'Salário', status: 'PAGO', valor: 5000, metodoPagamento: 'CREDITO', parcelas: 10 });

        expect(response.status).toBe(201);
        expect(pool.query.mock.calls[0][1]).toEqual(['Salário', ['5000.00'], 'Salário', null, 1, 'PAGO', 'ENTRADA', null, DONO]);
    });

    it.each([
        ['tipo inválido', { tipo: 'OUTRO' }, 'tipo'],
        ['mês inválido', { mes: '2026-00' }, 'mes']
    ])('POST com %s retorna 400 sem consultar o banco', async (_, alteracao, campo) => {
        const response = await request(app).post('/despesas').set(auth).send({ ...saida, ...alteracao });

        expect(response.status).toBe(400);
        expect(response.body.erros[0].path[0]).toBe(campo);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('PUT preserva forma de pagamento, parcelas e tipo de uma parcela', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

        await request(app).put('/despesas/1').set(auth).send(saida);

        expect(pool.query.mock.calls[0][0]).toMatch(/metodo_pagamento = CASE WHEN compra_id IS NULL/);
        expect(pool.query.mock.calls[0][0]).toMatch(/mes = COALESCE\(to_date\(\$8, 'YYYY-MM'\), mes\)/);
    });

    it('DELETE leva junto as outras parcelas da mesma compra, só do mesmo dono', async () => {
        pool.query.mockResolvedValueOnce({ rowCount: 3 });

        const response = await request(app).delete('/despesas/1').set(auth);

        expect(response.status).toBe(204);
        expect(pool.query.mock.calls[0][0]).toMatch(/compra_id = \(SELECT compra_id FROM despesas WHERE id = \$1 AND usuario_id = \$2\)/);
    });
});
