import * as z from 'zod';

const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;

const categoriaSchema = z.object({
    nome: z.string()
           .max(50),
    ativo: z.boolean()
            .default(true),
    descricao: z.string(),
    cor: z.string()
          .regex(hexColorRegex)
          .default("#64748B"),
    limiteMensal: z.number(),
    tipoCusto: z.enum(['FIXO', 'VARIAVEL'])
                .default('FIXO'),
    icone: z.string()
            .max(30)
            .default('tag')
})

export default categoriaSchema