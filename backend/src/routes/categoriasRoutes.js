import express from 'express'
import CategoriasController from '../controllers/categoriasController.js'
import { validarCategoria } from '../validators/categoriasValidator.js'

const routes = express.Router();

routes.get('/categorias', CategoriasController.listarCategorias);
routes.get('/categorias/:id', CategoriasController.buscarCategoriaPorId);
routes.post('/categorias',validarCategoria, CategoriasController.criarCategoria);
routes.put('/categorias/:id',validarCategoria, CategoriasController.atualizarCategoria);
routes.delete('/categorias/:id', CategoriasController.deletarCategoria);

export default routes;