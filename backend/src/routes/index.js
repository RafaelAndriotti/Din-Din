import authRoutes from './authRoutes.js';
import despesasRoutes from './despesasRoutes.js'
import categoriasRoutes from './categoriasRoutes.js';
import { autenticar } from '../middleware/autenticar.js';
import { limitar } from '../middleware/limites.js';

const routes = (app) => {
    app.route("/").get((req, res) => res.status(200).send("Despesas"))
    // Públicas. Limite apertado contra força bruta de senha: 10 tentativas por IP a cada 15 minutos.
    app.use('/auth', limitar({ minutos: 15, maximo: 10 }), authRoutes);
    // Daqui para baixo, toda rota exige token válido (F01): sem ele, 401.
    app.use(autenticar);
    app.use(despesasRoutes);
    app.use(categoriasRoutes);
}

export default routes
