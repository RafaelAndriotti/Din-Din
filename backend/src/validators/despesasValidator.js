import * as z from "zod";

// Mês do lançamento no formato AAAA-MM (ex.: 2026-11). O banco guarda como DATE no dia 1.
export const mesSchema = z.string()
                .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use o formato AAAA-MM');

export const despesaBase = z.object({
    descricao: z.string()
                .trim()
                .min(1)
                .max(100),
    categoria: z.string()
                .trim()
                .min(1)
                .max(20),
    status: z.enum(['PAGO', 'PENDENTE'])
            .default('PENDENTE'),
    valor: z.number()
            .multipleOf(0.01)
            .positive()
            .max(10000),
    // Opcional: sem mês, o POST usa o mês atual e o PUT mantém o mês que o registro já tem.
    mes: mesSchema.optional()
})

// Saída (despesa): o discriminador interno é a forma de pagamento.
export const despesaAVista = despesaBase.extend({
    tipo: z.literal('SAIDA'),
    metodoPagamento: z.enum(['PIX', 'DEBITO'])
}).transform((d) => ({ ...d, parcelas: 1 })) //Forcando o valor da parcelas sempre ser 1 para compras a vista

export const despesaCredito = despesaBase.extend({
    tipo: z.literal('SAIDA'),
    metodoPagamento: z.enum(['CREDITO']),
    parcelas: z.number()
               .int()
               .min(1)
               .max(48)
})

export const saidaSchema = z.discriminatedUnion('metodoPagamento', [despesaAVista, despesaCredito]);

// Entrada (salário, receita): não tem forma de pagamento nem parcelas.
// status PAGO aqui quer dizer "recebido"; PENDENTE, "a receber".
export const entradaSchema = despesaBase.extend({
    tipo: z.literal('ENTRADA')
}).transform((d) => ({ ...d, metodoPagamento: null, parcelas: 1 }))

// Sem "tipo" no body, o lançamento é uma saída: mantém o contrato de antes das entradas.
function tipoPadrao(body) {
    if (body && typeof body === 'object' && !Array.isArray(body) && body.tipo === undefined) {
        return { ...body, tipo: 'SAIDA' };
    }
    return body;
}

export const despesaSchema = z.preprocess(
    tipoPadrao,
    z.discriminatedUnion('tipo', [entradaSchema, saidaSchema])
);


export default despesaSchema;
