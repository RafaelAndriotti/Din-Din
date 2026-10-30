import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoriasController from '../src/controllers/categoriasController.js';
import pool from '../src/db/db.js';

// Mock do banco de dados para os testes não dependerem do Postgres estar ligado
vi.mock('../src/db/db.js', () => {
    return {
        default: {
            query: vi.fn()
        }
    };
});

describe('CategoriasController - Testes Unitários', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mocks dos objetos de requisição e resposta do Express
        req = {
            params: {},
            body: {}
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis()
        };

        next = vi.fn();
    });

    describe('listarCategorias', () => {
        it('deve listar todas as categorias com status 200', async () => {
            const categoriasMock = [
                { id: 1, nome: 'Alimentação', cor: '#FF0000', tipo_custo: 'variavel', ativo: true },
                { id: 2, nome: 'Salário', cor: '#00FF00', tipo_custo: 'fixo', ativo: true }
            ];

            pool.query.mockResolvedValueOnce({ rows: categoriasMock });

            await CategoriasController.listarCategorias(req, res, next);

            expect(pool.query).toHaveBeenCalledWith('SELECT * FROM categorias');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(categoriasMock);
        });

        it('deve retornar status 500 quando ocorrer erro no banco', async () => {
            pool.query.mockRejectedValueOnce(new Error('Falha de conexão'));

            await CategoriasController.listarCategorias(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Erro interno do servidor',
                    erro: 'Falha de conexão'
                })
            );
        });
    });

    describe('buscarCategoriaPorId', () => {
        it('deve retornar a categoria e status 200 quando encontrada', async () => {
            const categoriaMock = { id: 1, nome: 'Educação', cor: '#0000FF' };
            req.params = { id: '1' };

            pool.query.mockResolvedValueOnce({ rows: [categoriaMock] });

            await CategoriasController.buscarCategoriaPorId(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'SELECT * FROM categorias WHERE id = $1',
                ['1']
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(categoriaMock);
        });

        it('deve retornar status 500 se o banco falhar ao buscar por id', async () => {
            req.params = { id: '1' };
            pool.query.mockRejectedValueOnce(new Error('Erro no DB'));

            await CategoriasController.buscarCategoriaPorId(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Erro interno do servidor'
                })
            );
        });
    });

    describe('criarCategoria', () => {
        it('deve criar uma categoria e retornar status 201', async () => {
            const novaCategoria = {
                nome: 'Investimentos',
                tipo: 'receita',
                descricao: 'Rendimentos e dividendos',
                cor: '#10B981',
                limite_mensal: 500,
                tipo_custo: 'variavel',
                ativo: true
            };
            req.body = novaCategoria;

            const categoriaCriadaMock = { id: 10, ...novaCategoria };
            pool.query.mockResolvedValueOnce({ rows: [categoriaCriadaMock] });

            await CategoriasController.criarCategoria(req, res, next);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(categoriaCriadaMock);
        });

        it('deve retornar status 500 se o banco falhar na criação', async () => {
            req.body = { nome: 'Lazer' };
            pool.query.mockRejectedValueOnce(new Error('Erro de chave duplicada'));

            await CategoriasController.criarCategoria(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Erro interno do servidor'
                })
            );
        });
    });

    describe('atualizarCategoria', () => {
        it('deve atualizar uma categoria e retornar status 200', async () => {
            req.params = { id: '1' };
            req.body = {
                nome: 'Alimentação Atualizada',
                tipo: 'despesa',
                descricao: 'Restaurantes e compras',
                cor: '#F59E0B',
                limite_mensal: 1000,
                tipo_custo: 'variavel',
                ativo: true
            };

            const categoriaAtualizadaMock = { id: 1, ...req.body };
            pool.query.mockResolvedValueOnce({ rows: [categoriaAtualizadaMock] });

            await CategoriasController.atualizarCategoria(req, res, next);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(categoriaAtualizadaMock);
        });

        it('deve retornar status 500 se houver erro ao atualizar', async () => {
            req.params = { id: '1' };
            req.body = { nome: 'Erro' };
            pool.query.mockRejectedValueOnce(new Error('Erro no DB'));

            await CategoriasController.atualizarCategoria(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('deletarCategoria', () => {
        it('deve deletar a categoria e retornar status 204', async () => {
            req.params = { id: '1' };
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            await CategoriasController.deletarCategoria(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM categorias WHERE id = $1',
                ['1']
            );
            expect(res.status).toHaveBeenCalledWith(204);
        });

        it('deve retornar status 500 se houver falha ao deletar', async () => {
            req.params = { id: '1' };
            pool.query.mockRejectedValueOnce(new Error('Erro no DB'));

            await CategoriasController.deletarCategoria(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
