import authRoutes from './authRoutes.js';
import despesasRoutes from './despesasRoutes.js'
import categoriasRoutes from './categoriasRoutes.js';
import { autenticar } from '../middleware/autenticar.js';

const routes = (app) => {
    app.route("/").get((req, res) => res.status(200).send("Despesas"))
    // Públicas: cadastro e login.
    app.use('/auth', authRoutes);
    // Daqui para baixo, toda rota exige token válido (F01): sem ele, 401.
    app.use(autenticar);
    app.use(despesasRoutes);
    app.use(categoriasRoutes);
}

export default routes
