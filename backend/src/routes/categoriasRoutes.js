import express from 'express'
import CategoriasController from '../controllers/categoriasController.js'
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../validators/idSchema.js';
import categoriaSchema from '../validators/categoriasValidator.js';


const routes = express.Router();

routes.get('/categorias', CategoriasController.listarCategorias);
routes.get('/categorias/:id', validate({ params: idParamsSchema }), CategoriasController.buscarCategoriaPorId);
routes.post('/categorias', validate({ body: categoriaSchema }), CategoriasController.criarCategoria);
routes.put('/categorias/:id', validate({ params: idParamsSchema, body: categoriaSchema }), CategoriasController.atualizarCategoria);
routes.delete('/categorias/:id', validate({ params: idParamsSchema }), CategoriasController.deletarCategoria);

export default routes;