import * as z from "zod";

export const idParamsSchema = z.object({
    id: z.string()
    .regex(/^\d+$/)
    .coerce.number()
    .int()
    .positive()
    .max(2147483647)
})