import * as z from 'zod';

const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;

const categoriaSchema = z.object({
    nome: z.string()
           .trim()
           .min(1)
           .max(50),
    ativo: z.boolean()
            .default(true),
    descricao: z.string()
                .trim()
                .max(200),
    cor: z.string()
          .regex(hexColorRegex)
          .default("#64748B"),
    // Teto do NUMERIC(10, 2) do banco: acima disso o Postgres estouraria com erro 500.
    limiteMensal: z.number()
                   .nonnegative()
                   .max(99999999.99)
                   .multipleOf(0.01),
    tipoCusto: z.enum(['FIXO', 'VARIAVEL'])
                .default('FIXO'),
    // Nome de ícone no formato do lucide ("shopping-cart"), não texto livre.
    icone: z.string()
            .regex(/^[a-z0-9-]{1,30}$/)
            .default('tag')
})

export default categoriaSchema
