import pool from "../db/db.js";

// Colunas devolvidas pela API. O alias com aspas preserva o camelCase na chave do JSON
const COLUNAS = `id, nome, descricao, cor, icone, limite_mensal AS "limiteMensal", tipo_custo AS "tipoCusto", ativo`

// Toda query filtra por usuario_id = req.usuarioId, o dono vindo do token (F03, F06, F10-F12).
// Registro de outro usuário cai no mesmo 404 de registro inexistente.
// Erros de banco sobem para o handler central (middleware/erros.js).
class CategoriasController {

    static async listarCategorias (req, res, next){
        const { pagina, limite } = req.validacao.query;
        const { rows } = await pool.query(
            `SELECT ${COLUNAS} FROM categorias
            WHERE usuario_id = $1
            ORDER BY id
            LIMIT $2 OFFSET $3`,
            [req.usuarioId, limite, (pagina - 1) * limite]
        );

        return res.status(200).json(rows);
    }

    static async buscarCategoriaPorId(req, res, next) {
        const { rows } = await pool.query(
            `SELECT ${COLUNAS} FROM categorias WHERE id = $1 AND usuario_id = $2`,
            [req.validacao.params.id, req.usuarioId]
        );

        if(!rows[0]){
            return res.status(404).json({ message: "Registro nao encontrado" })
        }

        return res.status(200).json(rows[0])
    }

    static async criarCategoria(req, res, next){
        const { nome, ativo, descricao, cor, limiteMensal, tipoCusto, icone } = req.validacao.body
        // O dono vem do token, nunca do body.
        const { rows } = await pool.query(`INSERT INTO  categorias (nome, ativo, descricao, cor, limite_mensal, tipo_custo, icone, usuario_id)
                                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${COLUNAS}`, [nome, ativo, descricao, cor, limiteMensal, tipoCusto, icone, req.usuarioId]);

        return res.status(201).json(rows[0]);
    }

    static async atualizarCategoria(req, res, next){
        const { id } = req.validacao.params;
        const { nome, ativo, descricao, cor, limiteMensal, tipoCusto, icone } = req.validacao.body;

        const { rows } = await pool.query(
            `UPDATE categorias
            SET nome = $1, ativo = $2, descricao = $3, cor = $4, limite_mensal = $5, tipo_custo = $6, icone = $7
            WHERE id = $8 AND usuario_id = $9
            RETURNING ${COLUNAS}`,[nome, ativo, descricao, cor, limiteMensal, tipoCusto, icone, id, req.usuarioId]);

        if(!rows[0]){
            return res.status(404).json({ message: "Registro nao encontrado" })
        }

        return res.status(200).json(rows[0]);
    }

    static async deletarCategoria(req, res, next){
        const { id } = req.validacao.params;
        const { rowCount } = await pool.query(`DELETE FROM categorias WHERE id = $1 AND usuario_id = $2`, [id, req.usuarioId])

        if(rowCount === 0){
            return res.status(404).json({ message: 'Registro nao encontrado.' })
        }

        return res.status(204).end()
    }
}

export default CategoriasController
