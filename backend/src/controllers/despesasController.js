import pool from '../db/db.js'

// Colunas devolvidas pela API. O alias com aspas preserva o camelCase na chave do JSON
const COLUNAS = `id, descricao, valor, categoria, metodo_pagamento AS "metodoPagamento", parcelas, status`

// Toda query filtra por usuario_id = req.usuarioId, o dono vindo do token (F02, F07-F09).
// Registro de outro usuário cai no mesmo 404 de registro inexistente: a API não revela que ele existe.
// Erros de banco sobem para o handler central (middleware/erros.js), que responde 500 genérico.
class DespesasController {

    static async listarDespesas (req, res, next){
        const { pagina, limite } = req.validacao.query;
        const { rows } = await pool.query(
            `SELECT ${COLUNAS} FROM despesas
            WHERE usuario_id = $1
            ORDER BY id
            LIMIT $2 OFFSET $3`,
            [req.usuarioId, limite, (pagina - 1) * limite]
        );

        return res.status(200).json(rows);
    }

    static async criarDespesa (req, res, next){
        const { descricao, valor, categoria, metodoPagamento, parcelas, status } = req.validacao.body;
        // O dono vem do token, nunca do body.
        const { rows } = await pool.query(
            `INSERT INTO despesas (descricao, valor, categoria, metodo_pagamento, parcelas, status, usuario_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING ${COLUNAS}`,
            [descricao, valor, categoria, metodoPagamento, parcelas, status, req.usuarioId]
        );

        return res.status(201).json(rows[0]);
    }

    static async listarDespesasPorId (req, res, next){
        const { rows } = await pool.query(
            `SELECT ${COLUNAS} FROM despesas WHERE id = $1 AND usuario_id = $2`,
            [req.validacao.params.id, req.usuarioId]
        );

        if(rows.length === 0){
            return res.status(404).json({ message: "Despesa nao encontrada" })
        }

        res.status(200).json(rows[0]);
    }

    static async atualizarDespesa (req, res, next) {
        const { id } = req.validacao.params
        const { descricao, valor, categoria, metodoPagamento, parcelas, status } = req.validacao.body
        const { rows } = await pool.query(
            `UPDATE despesas
                SET descricao=$1,
                valor=$2,
                categoria=$3,
                metodo_pagamento=$4,
                parcelas=$5,
                status=$6
            WHERE id = $7 AND usuario_id = $8
            RETURNING ${COLUNAS}`,
            [descricao, valor, categoria, metodoPagamento, parcelas, status, id, req.usuarioId]
        );

        if (rows.length === 0) {
            return res.status(404).json({message: "Despesa nao encontrada"})
        }

        return res.status(200).json(rows[0]);
    }

    static async deletarDespesa(req, res, next){
        const { id } = req.validacao.params
        const { rowCount } = await pool.query(
            `DELETE FROM despesas WHERE id = $1 AND usuario_id = $2`,
            [id, req.usuarioId]
        )

        if (rowCount === 0){
            return res.status(404).json({ message: 'Despesa nao encontrada.' })
        }

        res.status(204).end()
    }

}

export default DespesasController;
