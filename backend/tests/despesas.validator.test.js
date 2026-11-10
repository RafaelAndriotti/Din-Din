import { describe, it, expect, vi } from 'vitest';
import { despesaSchema } from '../src/validators/despesasValidator.js';
import { validate } from '../src/middleware/validate.js';

/**
 * Testes do validador de despesas (src/validators/despesasValidator.js) — COR-1 e COR-11.
 * Regra de parcelas: só o CREDITO valida parcelas (1 a 48).
 * PIX e DEBITO ignoram o que vier em parcelas e gravam sempre 1 (decisão do Rafa).
 * Cada caso inválido confere o campo do erro, para o teste não passar por acidente.
 */

const base = {
    descricao: 'Mercado do mês',
    categoria: 'Alimentação',
    status: 'PAGO',
    valor: 150.9
};
const pix = { ...base, metodoPagamento: 'PIX' };
const credito = { ...base, metodoPagamento: 'CREDITO', parcelas: 3 };

// Retorna os campos (path[0]) que falharam; [] quando o body é válido.
function camposComErro(body) {
    const r = despesaSchema.safeParse(body);
    return r.success ? [] : r.error.issues.map((i) => i.path[0]);
}

describe('despesaSchema - corpo válido', () => {
    it.each([
        ['PIX', pix],
        ['DEBITO', { ...base, metodoPagamento: 'DEBITO' }],
        ['CREDITO', credito]
    ])('aceita uma despesa completa no %s', (_, body) => {
        expect(camposComErro(body)).toEqual([]);
    });

    it('usa PENDENTE quando status não é enviado', () => {
        const { status, ...semStatus } = pix;
        const r = despesaSchema.safeParse(semStatus);
        expect(r.success).toBe(true);
        expect(r.data.status).toBe('PENDENTE');
    });

    it('remove espaços nas pontas de descricao e categoria', () => {
        const r = despesaSchema.safeParse({ ...pix, descricao: '  Mercado  ', categoria: ' Lazer ' });
        expect(r.data.descricao).toBe('Mercado');
        expect(r.data.categoria).toBe('Lazer');
    });
});

describe('despesaSchema - metodoPagamento', () => {
    it.each([
        ['fora da lista', { metodoPagamento: 'BOLETO' }],
        ['minúsculo', { metodoPagamento: 'pix' }],
        ['ausente', { metodoPagamento: undefined }]
    ])('rejeita metodoPagamento %s', (_, alteracao) => {
        expect(camposComErro({ ...pix, ...alteracao })).toEqual(['metodoPagamento']);
    });
});

describe('despesaSchema - parcelas no à vista (PIX/DEBITO)', () => {
    it.each(['PIX', 'DEBITO'])('%s sem parcelas grava 1', (metodo) => {
        const r = despesaSchema.safeParse({ ...base, metodoPagamento: metodo });
        expect(r.success).toBe(true);
        expect(r.data.parcelas).toBe(1);
    });

    // Decisão: à vista ignora o que o cliente mandar em parcelas e grava 1, sem 400.
    it.each([1, 5, 0, -3, 2.5, '3', null])('PIX com parcelas %s é aceito e grava 1', (parcelas) => {
        const r = despesaSchema.safeParse({ ...pix, parcelas });
        expect(r.success).toBe(true);
        expect(r.data.parcelas).toBe(1);
    });

    it('DEBITO com parcelas 12 é aceito e grava 1', () => {
        const r = despesaSchema.safeParse({ ...base, metodoPagamento: 'DEBITO', parcelas: 12 });
        expect(r.success).toBe(true);
        expect(r.data.parcelas).toBe(1);
    });
});

describe('despesaSchema - parcelas no CREDITO', () => {
    it.each([1, 3, 48])('aceita %s parcelas e mantém o número', (parcelas) => {
        const r = despesaSchema.safeParse({ ...credito, parcelas });
        expect(r.success).toBe(true);
        expect(r.data.parcelas).toBe(parcelas);
    });

    it.each([
        ['ausente', undefined],
        ['zero', 0],
        ['negativa', -3],
        ['fracionada', 2.5],
        ['acima do teto', 49],
        ['que estoura o INTEGER do Postgres', 3000000000],
        ['string', '3'],
        ['null', null]
    ])('rejeita parcela %s', (_, parcelas) => {
        expect(camposComErro({ ...credito, parcelas })).toEqual(['parcelas']);
    });
});

describe('despesaSchema - valor', () => {
    it.each([10.01, 10.1, 0.07, 1.15, 19.99, 0.01, 10000])('aceita %s sem alterar o número', (valor) => {
        const r = despesaSchema.safeParse({ ...pix, valor });
        expect(r.success).toBe(true);
        expect(r.data.valor).toBe(valor);
    });

    it.each([
        ['mais de 2 casas', 10.005],
        ['casas demais em valor pequeno', 1e-7],
        ['zero', 0],
        ['negativo', -5],
        ['acima do teto', 10000.01],
        ['muito grande', 1e12],
        ['string', '10'],
        ['NaN', NaN],
        ['Infinity', Infinity],
        ['null', null],
        ['ausente', undefined]
    ])('rejeita valor %s', (_, valor) => {
        expect(camposComErro({ ...pix, valor })).toEqual(['valor']);
    });

    it('vale também no CREDITO (regra vem da base)', () => {
        expect(camposComErro({ ...credito, valor: -5 })).toEqual(['valor']);
    });
});

describe('despesaSchema - textos e status', () => {
    it.each([
        ['descricao vazia', { descricao: '' }, 'descricao'],
        ['descricao só com espaços', { descricao: '   ' }, 'descricao'],
        ['descricao com 101 caracteres', { descricao: 'a'.repeat(101) }, 'descricao'],
        ['categoria vazia', { categoria: '' }, 'categoria'],
        ['categoria só com espaços', { categoria: '   ' }, 'categoria'],
        ['categoria com 21 caracteres', { categoria: 'a'.repeat(21) }, 'categoria'],
        ['status fora da lista', { status: 'talvez' }, 'status'],
        ['status minúsculo', { status: 'pago' }, 'status']
    ])('rejeita %s', (_, alteracao, campo) => {
        expect(camposComErro({ ...pix, ...alteracao })).toEqual([campo]);
    });
});

describe('validate({ body: despesaSchema }) - middleware', () => {
    const criarRes = () => ({
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
    });

    it('chama next() e grava os dados validados em req.validacao.body', () => {
        const req = { body: { ...pix, parcelas: 5, descricao: '  Mercado  ' } };
        const res = criarRes();
        const next = vi.fn();

        validate({ body: despesaSchema })(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(req.validacao.body.parcelas).toBe(1);
        expect(req.validacao.body.descricao).toBe('Mercado');
    });

    it('responde 400 com a lista de erros e não chama next()', () => {
        const req = { body: { ...credito, parcelas: 0 } };
        const res = criarRes();
        const next = vi.fn();

        validate({ body: despesaSchema })(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Dados invalidos', erros: expect.any(Array) })
        );
        expect(next).not.toHaveBeenCalled();
    });
});
