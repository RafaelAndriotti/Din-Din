import * as z from 'zod';

// Query das listagens: ?pagina=1&limite=50. O teto de 100 itens limita o custo de cada resposta (O4).
export const paginacaoSchema = z.object({
    pagina: z.coerce.number().int().min(1).max(1000000).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(50)
});
