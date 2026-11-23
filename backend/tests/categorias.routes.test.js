import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { emitirToken } from '../src/auth/token.js';
import pool from '../src/db/db.js';

// Mock do banco de dados (Pool do pg)
vi.mock('../src/db/db.js', () => {
    return {
        default: {
            query: vi.fn()
        }
    };
});

// Dono das requisições destes testes.
const DONO = 7;
const auth = { Authorization: `Bearer ${emitirToken(DONO)}` };

/**
 * Testes de Integração de Rotas com Supertest
 * Substitui o teste manual no Insomnia / Postman!
 *
 * Usa o app real (criarApp): rate limit, autenticação, validate e handler de erro.
 */
describe('Rotas de Categorias (HTTP com Supertest)', () => {
    let app;

    beforeEach(() => {
        vi.resetAllMocks();
        app = criarApp();
    });

    describe('GET /categorias', () => {
        it('deve retornar status 200 e a lista de categorias do dono', async () => {
            const mockCategorias = [
                { id: 1, nome: 'Alimentação', cor: '#FF5733', tipoCusto: 'VARIAVEL', ativo: true },
                { id: 2, nome: 'Moradia', cor: '#33FF57', tipoCusto: 'FIXO', ativo: true }
            ];

            pool.query.mockResolvedValueOnce({ rows: mockCategorias });

            // Simula uma requisição GET como no Postman/Insomnia
            const response = await request(app).get('/categorias').set(auth);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockCategorias);
            expect(response.headers['content-type']).toMatch(/json/);
            expect(pool.query.mock.calls[0][1]).toEqual([DONO, 50, 0]);
        });

        it('deve retornar status 500 genérico se o banco falhar, sem a mensagem do banco', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {});
            pool.query.mockRejectedValueOnce(new Error('Erro de conexão ao banco'));

            const response = await request(app).get('/categorias').set(auth);

            expect(response.status).toBe(500);
            expect(response.body).toEqual({ message: 'Erro interno do servidor' });
        });
    });

    describe('GET /categorias/:id', () => {
        it('deve retornar status 200 e os dados da categoria encontrada', async () => {
            const mockCategoria = { id: 1, nome: 'Lazer', cor: '#8A2BE2' };
            pool.query.mockResolvedValueOnce({ rows: [mockCategoria] });

            const response = await request(app).get('/categorias/1').set(auth);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockCategoria);
        });
    });

    describe('POST /categorias', () => {
        it('deve criar uma nova categoria e retornar 201 com o objeto criado', async () => {
            const novaCategoria = {
                nome: 'Assinaturas',
                descricao: 'Netflix, Spotify, etc',
                cor: '#E50914',
                limiteMensal: 150.00,
                tipoCusto: 'FIXO',
                ativo: true
            };

            const categoriaRetornada = { id: 5, ...novaCategoria };
            pool.query.mockResolvedValueOnce({ rows: [categoriaRetornada] });

            // Simula um POST com JSON no body como no Postman/Insomnia
            const response = await request(app)
                .post('/categorias')
                .set(auth)
                .send(novaCategoria)
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(201);
            expect(response.body).toEqual(categoriaRetornada);
        });

        it('nome repetido para o mesmo dono responde 409', async () => {
            const duplicada = Object.assign(new Error('duplicate key value violates unique constraint "categorias_usuario_nome_key"'), { code: '23505' });
            pool.query.mockRejectedValueOnce(duplicada);

            const response = await request(app).post('/categorias').set(auth)
                .send({ nome: 'Lazer', descricao: 'Cinema', limiteMensal: 100 });

            expect(response.status).toBe(409);
            expect(JSON.stringify(response.body)).not.toContain('categorias_usuario_nome_key');
        });
    });

    describe('PUT /categorias/:id', () => {
        it('deve atualizar a categoria e retornar 200', async () => {
            const dadosAtualizados = {
                nome: 'Alimentação e Mercado',
                descricao: 'Mercado mensal e feira',
                cor: '#2ECC71',
                limiteMensal: 1200.00,
                tipoCusto: 'VARIAVEL',
                ativo: true
            };

            const categoriaAtualizada = { id: 1, ...dadosAtualizados };
            pool.query.mockResolvedValueOnce({ rows: [categoriaAtualizada] });

            const response = await request(app)
                .put('/categorias/1')
                .set(auth)
                .send(dadosAtualizados);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(categoriaAtualizada);
        });
    });

    describe('DELETE /categorias/:id', () => {
        it('deve deletar a categoria e retornar status 204', async () => {
            pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            const response = await request(app).delete('/categorias/1').set(auth);

            expect(response.status).toBe(204);
        });
    });

    // Validacao do :id (COR-3): id invalido nao pode chegar no banco
    describe.each([
        ['GET', 'get'],
        ['PUT', 'put'],
        ['DELETE', 'delete']
    ])('%s /categorias/:id - validacao do id', (_, metodo) => {
        const corpoValido = { nome: 'Lazer', descricao: 'Cinema', limiteMensal: 100 };

        it.each(['abc', '0', '-1', '1.5', '99999999999'])('id %s retorna 400 sem consultar o banco', async (id) => {
            const response = await request(app)[metodo]('/categorias/' + id).set(auth).send(corpoValido);

            expect(response.status).toBe(400);
            expect(Array.isArray(response.body.erros)).toBe(true);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('id valido passa o id como numero e o dono para o banco', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

            const response = await request(app)[metodo]('/categorias/1').set(auth).send(corpoValido);

            expect(response.status).toBe(metodo === 'delete' ? 204 : 200);
            expect(pool.query.mock.calls[0][0]).toMatch(/WHERE id = \$\d+ AND usuario_id = \$\d+/);
            expect(pool.query.mock.calls[0][1].slice(-2)).toEqual([1, DONO]);
        });

        // IDOR (F10-F12): registro de outro dono volta 404, igual a um id inexistente.
        it('id de outro dono retorna 404', async () => {
            pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            const response = await request(app)[metodo]('/categorias/1').set(auth).send(corpoValido);

            expect(response.status).toBe(404);
        });
    });

    describe('POST /categorias - body invalido', () => {
        it('retorna 400 sem consultar o banco', async () => {
            const response = await request(app).post('/categorias').set(auth).send({ descricao: 'sem nome' });

            expect(response.status).toBe(400);
            expect(Array.isArray(response.body.erros)).toBe(true);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('usuario_id no body é descartado: o dono vem do token', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            await request(app).post('/categorias').set(auth)
                .send({ nome: 'Lazer', descricao: 'Cinema', limiteMensal: 100, usuario_id: 99, usuarioId: 99 });

            expect(pool.query.mock.calls[0][1].at(-1)).toBe(DONO);
        });
    });

    describe('PUT /categorias/:id - body invalido', () => {
        it('id valido com body invalido retorna 400 sem consultar o banco', async () => {
            const response = await request(app).put('/categorias/1').set(auth).send({ descricao: 'sem nome' });

            expect(response.status).toBe(400);
            expect(Array.isArray(response.body.erros)).toBe(true);
            expect(pool.query).not.toHaveBeenCalled();
        });
    });
});
