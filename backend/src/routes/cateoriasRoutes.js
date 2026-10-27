import express from 'express'
import CategoriasController from '../controllers/categoriasController.js'
import { validarCategoria } from '../validators/categoriasValidator.js'

const routes = express.Router();

routes.get('/categorias', CategoriasController.listarCategorias);
routes.get('/categorias/:id',validarCategoria, CategoriasController.buscarCategoriaPorId);
routes.post('categorias/:id', CategoriasController.criarCategoria);
routes.put('/categiras/:id',validarCategoria, CategoriasController.atualizarCategoria);
routes.delete('/categorias/:id', CategoriasController.deletarCategoria);