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

// Dono das requisições destes testes: o id que o middleware autenticar tiraria do token.
const DONO = 7;

describe('CategoriasController - Testes Unitários', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mocks dos objetos de requisição e resposta do Express
        req = { usuarioId: DONO, validacao: { params: {}, body: {}, query: { pagina: 1, limite: 50 } } };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            send: vi.fn().mockReturnThis(),
            end: vi.fn().mockReturnThis()
        };

        next = vi.fn();
    });

    describe('listarCategorias', () => {
        it('deve listar só as categorias do dono, paginadas, com status 200', async () => {
            const categoriasMock = [
                { id: 1, nome: 'Alimentação', cor: '#FF0000', tipoCusto: 'VARIAVEL', ativo: true },
                { id: 2, nome: 'Salário', cor: '#00FF00', tipoCusto: 'FIXO', ativo: true }
            ];

            pool.query.mockResolvedValueOnce({ rows: categoriasMock });

            await CategoriasController.listarCategorias(req, res, next);

            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toMatch(/FROM categorias\s+WHERE usuario_id = \$1/);
            expect(sql).toMatch(/LIMIT \$2 OFFSET \$3/);
            expect(params).toEqual([DONO, 50, 0]);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(categoriasMock);
        });

        it('deve repassar o erro do banco para o handler central, sem responder', async () => {
            pool.query.mockRejectedValueOnce(new Error('Falha de conexão'));

            await expect(CategoriasController.listarCategorias(req, res, next)).rejects.toThrow('Falha de conexão');
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('buscarCategoriaPorId', () => {
        it('deve retornar a categoria e status 200 quando encontrada', async () => {
            const categoriaMock = { id: 1, nome: 'Educação', cor: '#0000FF' };
            req.validacao.params = { id: 1 };

            pool.query.mockResolvedValueOnce({ rows: [categoriaMock] });

            await CategoriasController.buscarCategoriaPorId(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM categorias WHERE id = $1 AND usuario_id = $2'),
                [1, DONO]
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(categoriaMock);
        });

        it('deve retornar 404 quando a categoria não é do dono (ou não existe)', async () => {
            req.validacao.params = { id: 1 };
            pool.query.mockResolvedValueOnce({ rows: [] });

            await CategoriasController.buscarCategoriaPorId(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('deve repassar o erro do banco ao buscar por id', async () => {
            req.validacao.params = { id: 1 };
            pool.query.mockRejectedValueOnce(new Error('Erro no DB'));

            await expect(CategoriasController.buscarCategoriaPorId(req, res, next)).rejects.toThrow();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('criarCategoria', () => {
        it('deve criar uma categoria do dono e retornar status 201', async () => {
            const novaCategoria = {
                nome: 'Investimentos',
                descricao: 'Rendimentos e dividendos',
                cor: '#10B981',
                limiteMensal: 500,
                tipoCusto: 'VARIAVEL',
                ativo: true,
                icone: 'tag'
            };
            req.validacao.body = novaCategoria;

            const categoriaCriadaMock = { id: 10, ...novaCategoria };
            pool.query.mockResolvedValueOnce({ rows: [categoriaCriadaMock] });

            await CategoriasController.criarCategoria(req, res, next);

            expect(pool.query.mock.calls[0][1].at(-1)).toBe(DONO);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(categoriaCriadaMock);
        });

        it('deve repassar o erro do banco na criação', async () => {
            req.validacao.body = { nome: 'Lazer' };
            pool.query.mockRejectedValueOnce(new Error('Erro de chave duplicada'));

            await expect(CategoriasController.criarCategoria(req, res, next)).rejects.toThrow();
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('atualizarCategoria', () => {
        it('deve atualizar uma categoria do dono e retornar status 200', async () => {
            req.validacao.params = { id: 1 };
            req.validacao.body = {
                nome: 'Alimentação Atualizada',
                descricao: 'Restaurantes e compras',
                cor: '#F59E0B',
                limiteMensal: 1000,
                tipoCusto: 'VARIAVEL',
                ativo: true,
                icone: 'tag'
            };

            const categoriaAtualizadaMock = { id: 1, ...req.validacao.body };
            pool.query.mockResolvedValueOnce({ rows: [categoriaAtualizadaMock] });

            await CategoriasController.atualizarCategoria(req, res, next);

            const [sql, params] = pool.query.mock.calls[0];
            expect(sql).toContain('WHERE id = $8 AND usuario_id = $9');
            expect(params.slice(-2)).toEqual([1, DONO]);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(categoriaAtualizadaMock);
        });

        it('deve repassar o erro do banco ao atualizar', async () => {
            req.validacao.params = { id: 1 };
            req.validacao.body = { nome: 'Erro' };
            pool.query.mockRejectedValueOnce(new Error('Erro no DB'));

            await expect(CategoriasController.atualizarCategoria(req, res, next)).rejects.toThrow();
        });
    });

    describe('deletarCategoria', () => {
        it('deve deletar a categoria do dono e retornar status 204', async () => {
            req.validacao.params = { id: 1 };
            pool.query.mockResolvedValueOnce({ rows: [], rowCount: 1 });

            await CategoriasController.deletarCategoria(req, res, next);

            expect(pool.query).toHaveBeenCalledWith(
                'DELETE FROM categorias WHERE id = $1 AND usuario_id = $2',
                [1, DONO]
            );
            expect(res.status).toHaveBeenCalledWith(204);
        });

        it('deve repassar o erro do banco ao deletar', async () => {
            req.validacao.params = { id: 1 };
            pool.query.mockRejectedValueOnce(new Error('Erro no DB'));

            await expect(CategoriasController.deletarCategoria(req, res, next)).rejects.toThrow();
        });
    });
});
