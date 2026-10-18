import express from 'express';
import DespesasController from '../controllers/despesasController.js';
import { validarDespesa } from '../validators/despesasValidator.js';

const routes = express.Router();

routes.get('/despesas', DespesasController.listarDespesas);
routes.post('/despesas', validarDespesa, DespesasController.criarDespesa);

export default routes;