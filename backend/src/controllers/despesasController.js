import pool from '../db/db.js'

// Colunas devolvidas pela API. O alias com aspas preserva o camelCase na chave do JSON
// mes sai como 'AAAA-MM', o mesmo formato que a API recebe.
const COLUNAS = `id, tipo, descricao, valor, categoria, metodo_pagamento AS "metodoPagamento", parcelas,
    parcela_atual AS "parcelaAtual", compra_id AS "compraId", status, to_char(mes, 'YYYY-MM') AS mes`

// Divide o total em parcelas sem perder centavo: as primeiras levam o resto da divisão.
// Ex.: R$ 100,00 em 3x = 33,34 + 33,33 + 33,33. Volta strings ("33.34") para o NUMERIC do banco,
// sem passar por float na soma.
export function dividirEmParcelas(valor, parcelas) {
    const centavos = Math.round(valor * 100);
    const base = Math.floor(centavos / parcelas);
    const resto = centavos - base * parcelas;
    return Array.from({ length: parcelas }, (_, i) => ((base + (i < resto ? 1 : 0)) / 100).toFixed(2));
}

// Toda query filtra por usuario_id = req.usuarioId, o dono vindo do token (F02, F07-F09).
// Registro de outro usuário cai no mesmo 404 de registro inexistente: a API não revela que ele existe.
// Erros de banco sobem para o handler central (middleware/erros.js), que responde 500 genérico.
class DespesasController {

    static async listarDespesas (req, res, next){
        const { pagina, limite, mes } = req.validacao.query;
        // ?mes=2026-11 traz só aquele mês; sem ele, traz tudo (contrato antigo).
        const { rows } = await pool.query(
            `SELECT ${COLUNAS} FROM despesas
            WHERE usuario_id = $1
              AND ($4::text IS NULL OR mes = to_date($4, 'YYYY-MM'))
            ORDER BY id
            LIMIT $2 OFFSET $3`,
            [req.usuarioId, limite, (pagina - 1) * limite, mes ?? null]
        );

        return res.status(200).json(rows);
    }

    static async criarDespesa (req, res, next){
        const { tipo, descricao, valor, categoria, metodoPagamento, parcelas, status, mes } = req.validacao.body;
        // Compra parcelada vira uma linha por mês, todas com o mesmo compra_id.
        // Um único INSERT ... SELECT grava todas: ou entram todas, ou nenhuma (sem transação manual).
        // Só a primeira parcela leva o status escolhido; as dos meses seguintes nascem pendentes.
        // O dono vem do token, nunca do body.
        const { rows } = await pool.query(
            `WITH compra AS (SELECT CASE WHEN $5::int > 1 THEN gen_random_uuid() END AS id)
            INSERT INTO despesas (descricao, valor, categoria, metodo_pagamento, parcelas, parcela_atual,
                                  status, tipo, mes, compra_id, usuario_id)
            SELECT $1, p.valor, $3, $4, $5::int,
                   CASE WHEN $5::int > 1 THEN p.n END,
                   CASE WHEN p.n = 1 THEN $6 ELSE 'PENDENTE' END,
                   $7,
                   (COALESCE(to_date($8, 'YYYY-MM'), date_trunc('month', current_date)::date)
                       + make_interval(months => p.n::int - 1))::date,
                   compra.id, $9
              FROM unnest($2::numeric[]) WITH ORDINALITY AS p(valor, n), compra
            RETURNING ${COLUNAS}`,
            [descricao, dividirEmParcelas(valor, parcelas), categoria, metodoPagamento, parcelas, status, tipo, mes ?? null, req.usuarioId]
        );

        // Responde com o lançamento do mês escolhido (a 1ª parcela, numa compra parcelada).
        const primeira = rows.find((r) => r.parcelaAtual == null || r.parcelaAtual === 1) ?? rows[0];
        return res.status(201).json(primeira);
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
        const { tipo, descricao, valor, categoria, metodoPagamento, parcelas, status, mes } = req.validacao.body
        // Edita só esta linha. Numa parcela (compra_id preenchido), tipo, forma de pagamento e
        // número de parcelas pertencem à compra inteira: o CASE mantém o que já está gravado.
        // Sem mes no body, o lançamento fica no mês em que já está.
        const { rows } = await pool.query(
            `UPDATE despesas
                SET descricao=$1,
                valor=$2,
                categoria=$3,
                metodo_pagamento = CASE WHEN compra_id IS NULL THEN $4 ELSE metodo_pagamento END,
                parcelas = CASE WHEN compra_id IS NULL THEN $5::int ELSE parcelas END,
                status=$6,
                tipo = CASE WHEN compra_id IS NULL THEN $7 ELSE tipo END,
                mes = COALESCE(to_date($8, 'YYYY-MM'), mes)
            WHERE id = $9 AND usuario_id = $10
            RETURNING ${COLUNAS}`,
            [descricao, valor, categoria, metodoPagamento, parcelas, status, tipo, mes ?? null, id, req.usuarioId]
        );

        if (rows.length === 0) {
            return res.status(404).json({message: "Despesa nao encontrada"})
        }

        return res.status(200).json(rows[0]);
    }

    static async deletarDespesa(req, res, next){
        const { id } = req.validacao.params
        // Excluir uma parcela exclui a compra toda (todas as linhas com o mesmo compra_id).
        // A subquery também filtra pelo dono: o compra_id de outro usuário nunca é lido.
        const { rowCount } = await pool.query(
            `DELETE FROM despesas
            WHERE usuario_id = $2
              AND (id = $1 OR compra_id = (SELECT compra_id FROM despesas WHERE id = $1 AND usuario_id = $2))`,
            [id, req.usuarioId]
        )

        if (rowCount === 0){
            return res.status(404).json({ message: 'Despesa nao encontrada.' })
        }

        res.status(204).end()
    }

}

export default DespesasController;
