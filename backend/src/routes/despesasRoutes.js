import express from 'express';
import DespesasController from '../controllers/despesasController.js'
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/idSchema.js';
import despesaSchema from '../validators/despesasValidator.js';

const routes = express.Router();

routes.get('/despesas', DespesasController.listarDespesas);
routes.post('/despesas', validate({ body: despesaSchema }), DespesasController.criarDespesa);
routes.get('/despesas/:id', validate({ params: idParamsSchema }), DespesasController.listarDespesasPorId);
routes.put('/despesas/:id', validate({ params: idParamsSchema, body: despesaSchema }), DespesasController.atualizarDespesa);
routes.delete('/despesas/:id', validate({ params: idParamsSchema }), DespesasController.deletarDespesa);


export default routes;