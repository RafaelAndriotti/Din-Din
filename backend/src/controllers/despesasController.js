import pool from '../db/db.js'

// const despesas = [ { id: 1, desc: "supermercado", category: "compras", payMethod: "PIX", installment: 0, status: "paid",  value: 250.0}]

// Colunas devolvidas pela API. O alias com aspas preserva o camelCase na chave do JSON
const COLUNAS = `id, descricao, valor, categoria, metodo_pagamento AS "metodoPagamento", parcelas, status`

class DespesasController {

    static async listarDespesas (req, res, next){
        try {
            const { rows } = await pool.query(
                `SELECT ${COLUNAS} FROM despesas`
            );

            return res.status(200).json(rows);
        
        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar despesas", erro: error.message });
        }
    }

    static async criarDespesa (req, res, next){
        const { descricao, valor, categoria, metodoPagamento, parcelas, status } = req.body;
        try {
            const { rows } = await pool.query(
                `INSERT INTO despesas (descricao, valor, categoria, metodo_pagamento, parcelas, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING ${COLUNAS}`,
                [descricao, valor, categoria, metodoPagamento, parcelas, status]
            );

            return res.status(201).json(rows[0]);

        } catch (error) {
            return res.status(500).json({ message: "Erro ao criar despesa", erro: error.message });
        }
    }

    static async listarDespesasPorId (req, res, next){
        try {
            const { rows } = await pool.query(
                `SELECT ${COLUNAS} FROM despesas WHERE id = $1`,
                [req.params.id]
            );

            if(rows.length === 0){
                return res.status(404).json({ message: "Despesa nao encontrada" })
            }

            res.status(200).json(rows[0]);

        } catch (error) {
            return res.status(500).json({ message: "erro interno no servidor", erro: error.message });
        }
    }

    static async atualizarDespesa (req, res, next) {
        try {
            const { id } = req.params
            const { descricao, valor, categoria, metodoPagamento, parcelas, status } = req.body
            const { rows } = await pool.query(
                `UPDATE despesas
                    SET descricao=$1,
                    valor=$2,
                    categoria=$3,
                    metodo_pagamento=$4,
                    parcelas=$5,
                    status=$6
                WHERE id=$7
                RETURNING ${COLUNAS}`,
                [descricao, valor, categoria, metodoPagamento, parcelas, status, id]
            );

            if (rows.length === 0) {
                return res.status(404).json({message: "Despesa nao encontrada"})
            }

            return res.status(200).json(rows[0]);

        } catch (error) {
            return res.status(500).json({ message: "Erro interno no servidor.", erro: error.message });
        }
    }

    static async deletarDespesa(req, res, next){
        try {
            const { id } = req.params
            const { rowCount } = await pool.query(
                `DELETE FROM despesas WHERE id=$1`,
                [id]
            )

            if (rowCount === 0){
                return res.status(404).json({ message: 'Despesa nao encontrada.' })
            }

            res.status(204).end()
        } catch (error) {
            return res.status(500).json({ message: "Erro interno no servidor.", erro: error.message });
        }
    }

}

export default DespesasController;