import * as z from 'zod';

// E-mail sem espaços e em minúsculas antes de validar: "Ana@X.com" e "ana@x.com" são a mesma conta.
const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const registroSchema = z.object({
    email,
    // 8+ caracteres (NIST SP 800-63B). O teto limita o custo do hash por requisição.
    senha: z.string().min(8).max(128)
});

// No login não se exige o mínimo: uma senha curta é só uma senha errada (401).
export const loginSchema = z.object({
    email,
    senha: z.string().min(1).max(128)
});
