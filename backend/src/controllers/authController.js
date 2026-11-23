import { randomUUID } from 'node:crypto';
import pool from '../db/db.js';
import { conferirSenha, gerarHash } from '../auth/senha.js';
import { emitirToken } from '../auth/token.js';

// Hash de uma senha aleatória, calculado uma vez na primeira necessidade. Serve para
// conferir a senha mesmo quando o e-mail não existe: assim "e-mail inexistente" e
// "senha errada" levam o mesmo tempo, e o tempo de resposta não revela quem tem conta.
let hashFalso;
const hashSemConta = () => (hashFalso ??= gerarHash(randomUUID()));

class AuthController {

    static async registrar(req, res, next) {
        const { email, senha } = req.validacao.body;
        const { rows } = await pool.query(
            `INSERT INTO usuarios (email, senha_hash) VALUES ($1, $2)
            ON CONFLICT (email) DO NOTHING
            RETURNING id, email`,
            [email, await gerarHash(senha)]
        );

        if (rows.length === 0) {
            return res.status(409).json({ message: 'Já existe uma conta com esse e-mail.' });
        }

        return res.status(201).json({ token: emitirToken(rows[0].id), usuario: rows[0] });
    }

    static async entrar(req, res, next) {
        const { email, senha } = req.validacao.body;
        const { rows } = await pool.query(
            `SELECT id, email, senha_hash FROM usuarios WHERE email = $1`,
            [email]
        );
        const usuario = rows[0];
        const senhaConfere = await conferirSenha(senha, usuario?.senha_hash ?? await hashSemConta());

        // Mesma resposta para e-mail inexistente e senha errada.
        if (!usuario || !senhaConfere) {
            return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
        }

        return res.status(200).json({ token: emitirToken(usuario.id), usuario: { id: usuario.id, email: usuario.email } });
    }
}

export default AuthController;
