import * as z from "zod";

export const despesaSchema = z.object({

    descricao: z.string(),
    categoria: z.string(),
    metodoPagamento: z.string(),
    parcelas: z.number(),
    status: z.string(),
    valor: z.number()

})

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