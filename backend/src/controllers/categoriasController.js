import pool from "../db/db.js";

class CategoriasController {

    static async listarCategorias (req, res, next){
        try {
            const { rows } = await pool.query('SELECT * FROM categorias');

            return res.status(200).json(rows);
        } catch (error) {
            return res.status(500).json({ message: "Erro interno do servidor", erro: error.message });
        }
    }

    static async buscarCategoriaPorId(req, res, next) {
        try {
            const { rows } = await pool.query('SELECT * FROM categorias WHERE id = $1', [req.params.id]);
            
            return res.status(200).json(rows[0])
        } catch (error) {
            return res.status(500).json({ message: "Erro interno do servidor", erro: error.message });
        }
    }

    static async criarCategoria(req, res, next){
        try {
            const { rows } = await pool.query(`INSERT INTO  categorias (nome, tipo, descricao, cor, limite_mensal, tipo_custo, ativo)
                                               VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`);
            
            return res.status(201).json(rows[0]);
        } catch (error) {
            return res.status(500).json({ message: "Erro interno do servidor", erro: error.message });

        }
    }

    static async atualizarCategoria(req, res, next){
        try {
            const { id } = req.params.id;
            const { nome, tipo, descricao, cor, limite_mensal, tipo_custo, ativo } = req.body;

            const { rows } = await pool.query(
                `UPDATE categorias
                SET nome = $1, tipo = $2, descricao = $3, cor = $4, limite_mensal = $5, tipo_custo = $6, ativo = $7
                WHERE id = $8
                RETURNING *`);
                
                return res.status(200).json(rows[0]);
        } catch (error) {
            return res.status(500).json({ message: "Erro interno do servidor", erro: error.message });

        }
    }

    static async deletarCategoria(req, res, next){
        try {
            const { id } = req.params.id;
            const { rows } = await pool.query(`DELETE FROM categorias WHERE id = $1`, [id])

            return res.status(204).json(rows[0])
        } catch (error) {
            return res.status(500).json({ message: "Erro interno do servidor", erro: error.message });

        }
    }
}

export default CategoriasController