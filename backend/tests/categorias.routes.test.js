import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import CategoriasController from '../src/controllers/categoriasController.js';
import pool from '../src/db/db.js';

// Mock do banco de dados (Pool do pg)
vi.mock('../src/db/db.js', () => {
    return {
        default: {
            query: vi.fn()
        }
    };
});

/**
 * Testes de Integração de Rotas com Supertest
 * Substitui o teste manual no Insomnia / Postman!
 * 
 * Cria uma instância do Express configurada com os middlewares e endpoints de categorias.
 */
describe('Rotas de Categorias (HTTP com Supertest)', () => {
    let app;

    beforeEach(() => {
        vi.clearAllMocks();

        // Cria uma aplicação Express para teste isolado das rotas
        app = express();
        app.use(express.json());

        // Montagem das rotas de categoria
        app.get('/categorias', CategoriasController.listarCategorias);
        app.get('/categorias/:id', CategoriasController.buscarCategoriaPorId);
        app.post('/categorias', CategoriasController.criarCategoria);
        app.put('/categorias/:id', CategoriasController.atualizarCategoria);
        app.delete('/categorias/:id', CategoriasController.deletarCategoria);
    });

    describe('GET /categorias', () => {
        it('deve retornar status 200 e a lista de categorias', async () => {
            const mockCategorias = [
                { id: 1, nome: 'Alimentação', cor: '#FF5733', tipoCusto: 'variavel', ativo: true },
                { id: 2, nome: 'Moradia', cor: '#33FF57', tipoCusto: 'fixo', ativo: true }
            ];

            pool.query.mockResolvedValueOnce({ rows: mockCategorias });

            // Simula uma requisição GET como no Postman/Insomnia
            const response = await request(app).get('/categorias');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockCategorias);
            expect(response.headers['content-type']).toMatch(/json/);
        });

        it('deve retornar status 500 se o banco falhar', async () => {
            pool.query.mockRejectedValueOnce(new Error('Erro de conexão ao banco'));

            const response = await request(app).get('/categorias');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('message', 'Erro interno do servidor');
        });
    });

    describe('GET /categorias/:id', () => {
        it('deve retornar status 200 e os dados da categoria encontrada', async () => {
            const mockCategoria = { id: 1, nome: 'Lazer', cor: '#8A2BE2' };
            pool.query.mockResolvedValueOnce({ rows: [mockCategoria] });

            const response = await request(app).get('/categorias/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockCategoria);
        });
    });

    describe('POST /categorias', () => {
        it('deve criar uma nova categoria e retornar 201 com o objeto criado', async () => {
            const novaCategoria = {
                nome: 'Assinaturas',
                tipo: 'despesa',
                descricao: 'Netflix, Spotify, etc',
                cor: '#E50914',
                limiteMensal: 150.00,
                tipoCusto: 'fixo',
                ativo: true
            };

            const categoriaRetornada = { id: 5, ...novaCategoria };
            pool.query.mockResolvedValueOnce({ rows: [categoriaRetornada] });

            // Simula um POST com JSON no body como no Postman/Insomnia
            const response = await request(app)
                .post('/categorias')
                .send(novaCategoria)
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(201);
            expect(response.body).toEqual(categoriaRetornada);
        });
    });

    describe('PUT /categorias/:id', () => {
        it('deve atualizar a categoria e retornar 200', async () => {
            const dadosAtualizados = {
                nome: 'Alimentação e Mercado',
                tipo: 'despesa',
                descricao: 'Mercado mensal e feira',
                cor: '#2ECC71',
                limiteMensal: 1200.00,
                tipoCusto: 'variavel',
                ativo: true
            };

            const categoriaAtualizada = { id: 1, ...dadosAtualizados };
            pool.query.mockResolvedValueOnce({ rows: [categoriaAtualizada] });

            const response = await request(app)
                .put('/categorias/1')
                .send(dadosAtualizados);

            expect(response.status).toBe(200);
            expect(response.body).toEqual(categoriaAtualizada);
        });
    });

    describe('DELETE /categorias/:id', () => {
        it('deve deletar a categoria e retornar status 204', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

            const response = await request(app).delete('/categorias/1');

            expect(response.status).toBe(204);
        });
    });
});
