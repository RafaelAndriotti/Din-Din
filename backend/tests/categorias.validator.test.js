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
        const { default: categoriaSchema } = await import('../src/validators/categoriasValidator.js');
        const { validate } = await import('../src/middleware/validate.js');

        const req = {
            body: {
                nome: 'Transporte',
                descricao: 'Combustível e passagens',
                cor: '#3B82F6',
                limiteMensal: 350.00,
                tipoCusto: 'VARIAVEL'
            }
        };

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        const next = vi.fn();

        validate({ body: categoriaSchema })(req, res, next);

        // Se os dados são válidos, não deve retornar 400 e deve chamar next()
        expect(res.status).not.toHaveBeenCalledWith(400);
        expect(next).toHaveBeenCalled();
        expect(req.validacao.body.nome).toBe('Transporte');
    });

    it('deve retornar 400 com lista de erros quando o nome estiver ausente', async () => {
        const { default: categoriaSchema } = await import('../src/validators/categoriasValidator.js');
        const { validate } = await import('../src/middleware/validate.js');

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

        validate({ body: categoriaSchema })(req, res, next);

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
        const { default: categoriaSchema } = await import('../src/validators/categoriasValidator.js');
        const { validate } = await import('../src/middleware/validate.js');

        const req = {
            body: {
                nome: 'Saúde',
                descricao: 'Consultas e remédios',
                limiteMensal: 200,
                cor: 'cor-invalida' // Cor deve ser regex hex ex: #FFFFFF
            }
        };

        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        };

        const next = vi.fn();

        validate({ body: categoriaSchema })(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        // Body completo: o único erro precisa ser a cor, senão o teste passa pelo motivo errado
        const { erros } = res.json.mock.calls[0][0];
        expect(erros.map((e) => e.path[0])).toEqual(['cor']);
        expect(next).not.toHaveBeenCalled();
    });
});

// Limites de conteúdo e de faixa (O3). Cada caso confere o campo do erro.
describe('categoriaSchema - limites de entrada (O3)', () => {
    const valida = { nome: 'Saúde', descricao: 'Consultas e remédios', limiteMensal: 200 };

    async function camposComErro(body) {
        const { default: categoriaSchema } = await import('../src/validators/categoriasValidator.js');
        const r = categoriaSchema.safeParse(body);
        return r.success ? [] : r.error.issues.map((i) => i.path[0]);
    }

    it.each([
        ['nome só com espaços', { nome: '   ' }, 'nome'],
        ['nome vazio', { nome: '' }, 'nome'],
        ['nome com 51 caracteres', { nome: 'a'.repeat(51) }, 'nome'],
        ['descricao de 10 kB', { descricao: 'a'.repeat(10 * 1024) }, 'descricao'],
        ['limiteMensal negativo', { limiteMensal: -1 }, 'limiteMensal'],
        ['limiteMensal acima do NUMERIC(10,2)', { limiteMensal: 1e12 }, 'limiteMensal'],
        ['limiteMensal com 3 casas', { limiteMensal: 10.005 }, 'limiteMensal'],
        ['icone com HTML', { icone: '<img src=x>' }, 'icone'],
        ['icone com maiúsculas e espaço', { icone: 'Shopping Cart' }, 'icone']
    ])('rejeita %s', async (_, alteracao, campo) => {
        expect(await camposComErro({ ...valida, ...alteracao })).toEqual([campo]);
    });

    it.each([0, 0.01, 1200.5, 99999999.99])('aceita limiteMensal %s', async (limiteMensal) => {
        expect(await camposComErro({ ...valida, limiteMensal })).toEqual([]);
    });

    it('tira os espaços das pontas do nome e aceita ícone no formato do lucide', async () => {
        const { default: categoriaSchema } = await import('../src/validators/categoriasValidator.js');
        const r = categoriaSchema.safeParse({ ...valida, nome: '  Saúde  ', icone: 'shopping-cart' });

        expect(r.data.nome).toBe('Saúde');
        expect(r.data.icone).toBe('shopping-cart');
    });
});
