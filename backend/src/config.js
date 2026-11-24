// Configuração lida do .env e validada no boot (F13).
// Se faltar variável, se ela ainda tiver o valor de exemplo do .env.example ou se a senha
// for curta, a API nem sobe: é melhor falhar aqui do que na primeira query, ou com uma
// credencial que está publicada no repositório.
import * as z from 'zod';

// Todos os valores de exemplo do .env.example terminam em "_aqui".
const semExemplo = (schema) => schema.refine((v) => !v.endsWith('_aqui'), 'ainda é o valor de exemplo do .env.example');

const EnvSchema = z.object({
    // Admin do banco: o contêiner cria este usuário como superusuário. Só aplica o init.sql,
    // por isso é opcional: em produção a API não deve nem conhecer essa senha. Se vier, é validada.
    POSTGRES_USER: semExemplo(z.string().min(1)).optional(),
    POSTGRES_PASSWORD: semExemplo(z.string().min(12)).optional(),
    POSTGRES_DB: z.string().min(1),
    POSTGRES_HOST: z.string().min(1).default('127.0.0.1'),
    POSTGRES_PORT: z.coerce.number().int().positive().default(5434),
    // Banco gerenciado (Neon) exige TLS; o Postgres do Docker local não tem.
    POSTGRES_SSL: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
    // 127.0.0.1 na sua máquina (F05). Em hospedagem (Render), 0.0.0.0: o proxy com TLS da plataforma fica na frente.
    HOST: z.string().min(1).default('127.0.0.1'),
    // Quantos proxies há na frente da API. 0 local; 1 no Render. Sem isso o rate limit vê o IP do proxy, não o do usuário.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    // Role com que a API conecta: sem superusuário, criada pelo init.sql (F04).
    APP_DB_USER: semExemplo(z.string().min(1)),
    APP_DB_PASSWORD: semExemplo(z.string().min(12)),
    // Assina os tokens de login.
    JWT_SECRET: semExemplo(z.string().min(32)),
    PORT: z.coerce.number().int().positive().default(3000)
}).refine((env) => env.APP_DB_USER !== env.POSTGRES_USER, {
    message: 'precisa ser diferente de POSTGRES_USER: a API não conecta como superusuário',
    path: ['APP_DB_USER']
});

// A mensagem lista o nome de cada variável com problema, nunca o valor dela.
export function lerConfig(env) {
    const resultado = EnvSchema.safeParse(env);
    if (!resultado.success) {
        throw new Error(`Configuração inválida no .env:\n${z.prettifyError(resultado.error)}`);
    }
    return resultado.data;
}

export const config = lerConfig(process.env);
