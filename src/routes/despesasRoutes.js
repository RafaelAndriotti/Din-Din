import express from 'express';
import DespesasController from '../controllers/despesasController.js';
import { validarDespesa } from '../validators/despesasValidator.js';

const routes = express.Router();

routes.get('/despesas', DespesasController.listarDespesas);
routes.post('/despesas', validarDespesa, DespesasController.criarDespesa);
routes.get('/despesas/:id', DespesasController.listarDespesasPorId);
routes.put('/despesas/:id', DespesasController.atualizarDespesa);
routes.delete('/despesas/:id', DespesasController.deletarDespesa);


export default routes;