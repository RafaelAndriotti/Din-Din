import despesaValidator from '../validators/despesasValidator.js'
import pool from '../db/db.js'

// const despesas = [ { id: 1, desc: "supermercado", category: "compras", payMethod: "PIX", installment: 0, status: "paid",  value: 250.0}]

class DespesasController {

    static async listarDespesas (req, res, next){
        try {
            const { rows } = await pool.query(
                'SELECT * FROM despesas'
            );

            return res.status(200).json(rows);
        
        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar despesas", erro: error.message });
        }
    }

    static async criarDespesa (req, res, next){
        const { desc, value, category, payMethod, installment, status } = req.body;
        try {
            const { rows } = await pool.query(
                `INSERT INTO despesas ("desc", value, category, payMethod, installment, status)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [desc, value, category, payMethod, installment, status]
            );

            return res.status(201).json(rows[0]);

        } catch (error) {
            return res.status(500).json({ message: "Erro ao criar despesa", erro: error.message });
        }
    }

    static async listarDespesasPorId (req, res, next){
        try {
            const { rows } = await pool.query(
                'SELECT * FROM despesas WHERE id = $1',
                [req.params.id]
            );

            if(!rows.length === 0){
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
            const { desc, value, category, payMethod, installment, status } = req.body
            const { rows } = await pool.query(
                `UPDATE despesas
                    SET "desc"=$1,
                    value=$2,
                    category=$3,
                    payMethod=$4,
                    installment=$5,
                    status=$6
                WHERE id=$7
                RETURNING *`,
                [desc, value, category, payMethod, installment, status, id]
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
            const { rows } = await pool.query(
                `DELETE FROM despesas WHERE id=$1`,
                [id]
            )

            if (rows === 0){
                return res.status(404).json({ message: 'Despesa nao encontrada.' })
            }

            res.status(200).json({ message: `Registro ${id} deletado com sucesso.` })
        } catch (error) {
            return res.status(500).json({ message: "Erro interno no servidor.", erro: error.message });
        }
    }

}

export default DespesasController;