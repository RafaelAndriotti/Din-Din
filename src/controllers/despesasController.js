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
            const {  } = req.body


        } catch (error) {
            return res.staus(500).json({ message: "Erro interno no servidor", erro: error.message });
        }
    }

}

export default DespesasController;