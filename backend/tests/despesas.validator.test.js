import { describe, it, expect, vi } from 'vitest';
import { validarDespesa, despesaSchema } from '../src/validators/despesasValidator.js';

/**
 * Testes do validador de despesas (src/validators/despesasValidator.js) — item COR-1.
 * Cada caso inválido confere que o erro aponta para o campo certo,
 * para o teste não passar "por acidente" por causa de outro campo.
 */

const valida = {
    descricao: 'Mercado do mês',
    categoria: 'Alimentação',
    metodoPagamento: 'PIX',
    parcelas: 3, // shortcut: base evita o mínimo de parcelas, que ainda está em decisão (1 = à vista?)
    status: 'PAGO',
    valor: 150.9
};

// Retorna os campos (path[0]) que falharam; [] quando o body é válido.
function camposComErro(body) {
    const r = despesaSchema.safeParse(body);
    return r.success ? [] : r.error.issues.map((i) => i.path[0]);
}

describe('despesaSchema - corpo válido', () => {
    it('aceita uma despesa completa', () => {
        expect(camposComErro(valida)).toEqual([]);
    });

    it('usa PENDENTE quando status não é enviado', () => {
        const { status, ...semStatus } = valida;
        const r = despesaSchema.safeParse(semStatus);
        expect(r.success).toBe(true);
        expect(r.data.status).toBe('PENDENTE');
    });

    it.each(['PIX', 'DEBITO', 'CREDITO'])('aceita metodoPagamento %s', (metodo) => {
        expect(camposComErro({ ...valida, metodoPagamento: metodo })).toEqual([]);
    });
});

describe('despesaSchema - valor', () => {
    it.each([10.01, 10.1, 0.07, 1.15, 19.99, 0.01, 10000])('aceita %s sem alterar o número', (valor) => {
        const r = despesaSchema.safeParse({ ...valida, valor });
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
        expect(camposComErro({ ...valida, valor })).toEqual(['valor']);
    });

    it('não arredonda 10.005 em silêncio: falha em vez de virar 10.01', () => {
        const r = despesaSchema.safeParse({ ...valida, valor: 10.005 });
        expect(r.success).toBe(false);
    });
});

describe('despesaSchema - demais campos', () => {
    it.each([
        ['descricao vazia', { descricao: '' }, 'descricao'],
        ['descricao com 101 caracteres', { descricao: 'a'.repeat(101) }, 'descricao'],
        ['categoria vazia', { categoria: '' }, 'categoria'],
        ['categoria com 21 caracteres', { categoria: 'a'.repeat(21) }, 'categoria'],
        ['metodoPagamento fora da lista', { metodoPagamento: 'BOLETO' }, 'metodoPagamento'],
        ['metodoPagamento minúsculo', { metodoPagamento: 'pix' }, 'metodoPagamento'],
        ['status fora da lista', { status: 'talvez' }, 'status'],
        ['parcelas zero', { parcelas: 0 }, 'parcelas'],
        ['parcelas negativas', { parcelas: -3 }, 'parcelas'],
        ['parcelas fracionadas', { parcelas: 1.5 }, 'parcelas']
    ])('rejeita %s', (_, alteracao, campo) => {
        expect(camposComErro({ ...valida, ...alteracao })).toEqual([campo]);
    });

    it.each([
        ['parcelas acima do teto', { parcelas: 49 }, 'parcelas'],
        ['parcelas que estouram o INTEGER do Postgres', { parcelas: 3000000000 }, 'parcelas'],
        ['descricao só com espaços', { descricao: '   ' }, 'descricao'],
        ['categoria só com espaços', { categoria: '   ' }, 'categoria']
    ])('rejeita %s', (_, alteracao, campo) => {
        expect(camposComErro({ ...valida, ...alteracao })).toEqual([campo]);
    });

    it('remove espaços nas pontas de descricao e categoria', () => {
        const r = despesaSchema.safeParse({ ...valida, descricao: '  Mercado  ', categoria: ' Lazer ' });
        expect(r.data.descricao).toBe('Mercado');
        expect(r.data.categoria).toBe('Lazer');
    });

    it('aceita parcelas 48 (teto)', () => {
        expect(camposComErro({ ...valida, parcelas: 48 })).toEqual([]);
    });

    // Pendente de decisão do Rafa (COR-11): parcelas 1 representa compra à vista? Hoje o schema exige >= 2.
    it.todo('define o mínimo de parcelas (1 = à vista ou campo opcional fora do crédito)');
});

describe('validarDespesa - middleware', () => {
    const criarRes = () => ({
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
    });

    it('chama next() e troca req.body pelos dados validados', () => {
        const { status, ...semStatus } = valida;
        const req = { body: semStatus };
        const res = criarRes();
        const next = vi.fn();

        validarDespesa(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(req.body.status).toBe('PENDENTE');
    });

    it('responde 400 com a lista de erros e não chama next()', () => {
        const req = { body: { ...valida, valor: -1 } };
        const res = criarRes();
        const next = vi.fn();

        validarDespesa(req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Dados invalidos', erros: expect.any(Array) })
        );
        expect(next).not.toHaveBeenCalled();
    });
});
