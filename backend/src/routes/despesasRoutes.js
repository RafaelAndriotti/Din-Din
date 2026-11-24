import express from 'express';
import DespesasController from '../controllers/despesasController.js'
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/idSchema.js';
import despesaSchema, { mesSchema } from '../validators/despesasValidator.js';
import { paginacaoSchema } from '../validators/paginacaoSchema.js';

const routes = express.Router();

// GET /despesas?mes=2026-11&pagina=1&limite=50
const listagemSchema = paginacaoSchema.extend({ mes: mesSchema.optional() });

routes.get('/despesas', validate({ query: listagemSchema }), DespesasController.listarDespesas);
routes.post('/despesas', validate({ body: despesaSchema }), DespesasController.criarDespesa);
routes.get('/despesas/:id', validate({ params: idParamsSchema }), DespesasController.listarDespesasPorId);
routes.put('/despesas/:id', validate({ params: idParamsSchema, body: despesaSchema }), DespesasController.atualizarDespesa);
routes.delete('/despesas/:id', validate({ params: idParamsSchema }), DespesasController.deletarDespesa);


export default routes;