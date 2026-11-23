import { lerToken } from '../auth/token.js';

// Exige "Authorization: Bearer <token>" e grava o dono da requisição em req.usuarioId (F01).
// Montado em routes/index.js antes dos routers de despesas e categorias.
export function autenticar(req, res, next) {
    const [tipo, token] = (req.get('authorization') ?? '').split(' ');
    const usuarioId = tipo === 'Bearer' && token ? lerToken(token) : null;

    if (!usuarioId) {
        return res.status(401).set('WWW-Authenticate', 'Bearer').json({ message: 'Faça login para continuar.' });
    }

    req.usuarioId = usuarioId;
    next();
}
