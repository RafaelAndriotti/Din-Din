import rateLimit from 'express-rate-limit';

// Limite de requisições por IP numa janela de tempo (O4). Acima dele: 429 em JSON.
// Cada chamada cria um contador novo, guardado na memória do processo.
// shortcut: o contador zera quando a API reinicia e não é dividido entre processos; com mais de uma instância, trocar por um store compartilhado (Redis).
export const limitar = ({ minutos, maximo }) => rateLimit({
    windowMs: minutos * 60 * 1000,
    limit: maximo,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Muitas requisições. Tente de novo em alguns minutos.' }
});
