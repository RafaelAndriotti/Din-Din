import { describe, it, expect, vi } from 'vitest';

/**
 * Testes para o validador de categorias (src/validators/categoriasValidator.js)
 * 
 * ATENÇÃO: Se o arquivo categoriasValidator.js contiver erros de sintaxe Zod
 * (como `export * as z` ou `z.Object`), este arquivo acusará o erro na importação.
 */

describe('CategoriasValidator - Validações do Zod e Middleware', () => {
    it('deve validar e avançar quando os dados da categoria forem válidos', async () => {
        // Importação dinâmica para capturar erros de sintaxe caso o arquivo ainda não tenha sido corrigido
        const { validarCategoria, default: categoriaSchema } = await import('../src/validators/categoriasValidator.js');

        const req = {
            body: {
                nome: 'Transporte',
                descricao: 'Combustível e passagens',
                cor: '#3B82F6',
                limiteMensal: 350.00,
                tipoCusto: 'variavel'
            }
        };

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        const next = vi.fn();

        validarCategoria(req, res, next);

        // Se os dados são válidos, não deve retornar 400 e deve chamar next()
        expect(res.status).not.toHaveBeenCalledWith(400);
        expect(next).toHaveBeenCalled();
    });

    it('deve retornar 400 com lista de erros quando o nome estiver ausente', async () => {
        const { validarCategoria } = await import('../src/validators/categoriasValidator.js');

        const req = {
            body: {
                descricao: 'Sem nome'
            }
        };

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        const next = vi.fn();

        validarCategoria(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Dados invalidos',
                erros: expect.any(Array)
            })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('deve rejeitar uma cor hexadecimal inválida', async () => {
        const { validarCategoria } = await import('../src/validators/categoriasValidator.js');

        const req = {
            body: {
                nome: 'Saúde',
                cor: 'cor-invalida' // Cor deve ser regex hex ex: #FFFFFF
            }
        };

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        const next = vi.fn();

        validarCategoria(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });
});
