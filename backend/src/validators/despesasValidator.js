import * as z from "zod";

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
            .max(10000)
})

export const despesaAVista = despesaBase.extend({
    metodoPagamento: z.enum(['PIX', 'DEBITO'])
})

export const despesaCredito = despesaBase.extend({
    metodoPagamento: z.enum(['CREDITO']),
    parcelas: z.number()
               .int()
               .min(1)
               .max(48)
})

export const despesaSchema = z.discriminatedUnion('metodoPagamento', [despesaAVista, despesaCredito]);

export function validarDespesa(req, res, next){
    //Se a validacao falhar, retorna 400 com os erros detalhados
        const validacao = despesaSchema.safeParse(req.body);

            if(!validacao.success) {
                return res.status(400).json({
                    message: "Dados invalidos",
                    erros: validacao.error.issues //Mostra qual o campo faltou ou veio com tipo errado
                });
            }

            req.body = validacao.data
            next();
}

export default despesaSchema;