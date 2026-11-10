export const validate = ({ params, body, query }) => (req, res, next) => {
    req.validacao ??= {};
    for (const [parte, schema] of Object.entries({ params, body, query })) {
        if (!schema) continue;
        const r = schema.safeParse(req[parte]);
        if (!r.success) return res.status(400).json({ message: "Dados invalidos", erros: r.error.issues })
        req.validacao[parte] = r.data;
    }
    next();
};