import express from 'express';
import AuthController from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registroSchema } from '../validators/authValidator.js';

// Rotas públicas. Montadas em /auth por routes/index.js.
const routes = express.Router();

routes.post('/registro', validate({ body: registroSchema }), AuthController.registrar);
routes.post('/login', validate({ body: loginSchema }), AuthController.entrar);

export default routes;
