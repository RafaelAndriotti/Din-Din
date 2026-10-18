import despesasRoutes from './despesasRoutes.js'

const routes = (app) => {
    app.route("/").get((req, res) => res.status(200).send("Despesas"))
    app.use(despesasRoutes);
}

export default routes