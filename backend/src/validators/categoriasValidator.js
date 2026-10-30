import * as z from 'zod';

const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;

const categoriaSchema = z.object({
    nome: z.string().max(50),
    ativo: z.boolean().default(true),
    descricao: z.string(),
    cor: z.string().regex(hexColorRegex).default("#64748B"),
    limite_mensal: z.number(),
    tipo_custo: z.enum(['fixo', 'variavel']).default('fixo'),
    icone: z.string().max(30).default('tag')
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
    next();
}

export default categoriaSchema