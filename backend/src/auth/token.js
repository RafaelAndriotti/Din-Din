// Token de sessão: JWT assinado com HS256 e o JWT_SECRET do .env.
// Guarda só o id do usuário (sub) e vence em 1 hora; depois disso é preciso entrar de novo.
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const VALIDADE = '1h';

export const emitirToken = (usuarioId) =>
    jwt.sign({}, config.JWT_SECRET, { algorithm: 'HS256', expiresIn: VALIDADE, subject: String(usuarioId) });

// Devolve o id do usuário, ou null se o token for inválido, adulterado ou vencido.
export function lerToken(token) {
    try {
        // Algoritmo fixo: quem decide como conferir é o servidor, não o cabeçalho do token ("alg": "none").
        const { sub } = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
        const id = Number(sub);
        return Number.isInteger(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}
