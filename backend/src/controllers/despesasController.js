import despesaValidator from '../validators/despesasValidator.js'

const despesas = [ { id: 1, desc: "supermercado", category: "compras", payMethod: "PIX", installment: 0, status: "paid",  value: 250.0}]

class DespesasController {

    static async listarDespesas (req, res, next){
        try {

            return res.status(200).json(despesas);
        
        } catch (error) {
            return res.status(500).json({ message: "Erro ao buscar despesas", erro: error.message });
        }
    }

    static async criarDespesa (req, res, next){
        try {
            const despesa = req.body;

            const novaDespesa = {
                id: Date.now(),
                ...despesa
            };

            despesas.push(novaDespesa)

            return res.status(201).json(novaDespesa);

        } catch (error) {
            return res.status(500).json({ message: "erro interno no servidor", erro: error.message });
        }
    }

    static async listarDespesasPorId (req, res, next){
        try {
            const id  = Number(req.params.id);

             const despesaEncontrada = despesas.find((item) => item.id === id);

            if(!despesaEncontrada){
                return res.status(404).json({ message: "Despesa nao encontrada" })
            }

            res.status(200).json(despesaEncontrada);

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