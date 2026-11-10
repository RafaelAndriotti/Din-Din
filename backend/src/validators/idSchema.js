import * as z from "zod";

export const idParamsSchema = z.object({
    id: z.string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number()
           .int()
           .positive()
           .max(2147483647))
    
})