import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import routes from '../src/routes/index.js';
import pool from '../src/db/db.js';

vi.mock('../src/db/db.js', () => ({
    default: { query: vi.fn() }
}));

describe('Rotas de Despesas - validacao do :id (COR-3)', () => {
    let app;
    const corpoValido = { descricao: 'Mercado', categoria: 'Alimentacao', status: 'PAGO', valor: 150.9, metodoPagamento: 'PIX' };

    beforeEach(() => {
        vi.resetAllMocks();
        app = express();
        app.use(express.json());
        routes(app);
    });

    describe.each([
        ['GET', 'get'],
        ['PUT', 'put'],
        ['DELETE', 'delete']
    ])('%s /despesas/:id', (_, metodo) => {
        it.each(['abc', '0', '-1', '1.5', '99999999999'])('id %s retorna 400 sem consultar o banco', async (id) => {
            const response = await request(app)[metodo]('/despesas/' + id).send(corpoValido);

            expect(response.status).toBe(400);
            expect(Array.isArray(response.body.erros)).toBe(true);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('id valido passa o id como numero para o banco', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

            const response = await request(app)[metodo]('/despesas/1').send(corpoValido);

            expect(response.status).toBe(metodo === 'delete' ? 204 : 200);
            expect(pool.query.mock.calls[0][1]).toContain(1);
        });
    });

    it('PUT com id valido e body invalido retorna 400 sem consultar o banco', async () => {
        const response = await request(app).put('/despesas/1').send({ descricao: '' });

        expect(response.status).toBe(400);
        expect(Array.isArray(response.body.erros)).toBe(true);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('POST com body invalido retorna 400 sem consultar o banco', async () => {
        const response = await request(app).post('/despesas').send({ descricao: '' });

        expect(response.status).toBe(400);
        expect(Array.isArray(response.body.erros)).toBe(true);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('POST valido de despesa PIX grava parcelas 1', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const response = await request(app).post('/despesas').send({ ...corpoValido, parcelas: 5 });

        expect(response.status).toBe(201);
        expect(pool.query.mock.calls[0][1]).toEqual(['Mercado', 150.9, 'Alimentacao', 'PIX', 1, 'PAGO']);
    });
});
