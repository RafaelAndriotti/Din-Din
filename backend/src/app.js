import express from 'express';
import routes from './routes/index.js'
import { tratarErros } from './middleware/erros.js';
import { limitar } from './middleware/limites.js';

// Cada chamada monta um app novo, com os contadores de rate limit zerados (os testes usam isso).
export function criarApp() {
    const app = express();
    app.disable('x-powered-by'); // não anuncia o framework em toda resposta
    app.use(limitar({ minutos: 1, maximo: 100 })); // O4: teto geral por IP
    app.use(express.json())

    routes(app)

    app.use(tratarErros) // O1 e O2: sempre por último
    return app;
}

export default criarApp();
