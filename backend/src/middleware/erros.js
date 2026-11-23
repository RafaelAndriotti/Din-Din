// Handler de erro central (O1, O2). Fica por último em app.js.
// O Express 5 encaminha para cá todo erro das rotas, inclusive os de funções async,
// então os controllers não precisam de try/catch. O cliente recebe só uma mensagem
// genérica em JSON; o detalhe (mensagem do banco, stack) fica no log do servidor.
export function tratarErros(err, req, res, next) {
    if (res.headersSent) return next(err);

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'JSON inválido.' });
    }
    // unique_violation do Postgres: o registro já existe (ex.: categoria com o mesmo nome).
    if (err.code === '23505') {
        return res.status(409).json({ message: 'Já existe um registro com esses dados.' });
    }
    // Demais erros do body-parser (corpo grande demais, charset inválido) já trazem um status 4xx.
    if (err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({ message: 'Requisição inválida.' });
    }

    console.error(err);
    return res.status(500).json({ message: 'Erro interno do servidor' });
}
