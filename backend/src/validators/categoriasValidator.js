export * as z from 'zod';

const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;

const categoriaSchema = z.Object({
    nome: z.string(),
    tipo: z.string(),
    descricao: z.string(),
    cor: z.string().regex(hexColorRegex).default("#64748B"),
    limite_mensal: z.Number(),
    tipo_custo: z.enum()
})

export function validarCategoria(req, res, next) {
    const validacao = categoriaSchema.safeParse(req.body);

    if (!validacao.success) {
        return res.status(400).json({
            message: "Dados invalidos",
            erros: validacao.error.issues
        })
    }

    req.body = validacao.data;
}

export default categoriaSchema