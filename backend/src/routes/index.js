import despesasRoutes from './despesasRoutes.js'
import categoriasRoutes from './categoriasRoutes.js';

const routes = (app) => {
    app.route("/").get((req, res) => res.status(200).send("Despesas"))
    app.use(despesasRoutes);
    app.use(categoriasRoutes);
}

export default routes