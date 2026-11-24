import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import routes from './routes/index.js'
import { config } from './config.js';
import { tratarErros } from './middleware/erros.js';
import { limitar } from './middleware/limites.js';

// Build do React (npm run build). Se a pasta não existir (dev, testes), o static só passa adiante.
const FRONT = fileURLToPath(new URL('../../frontend/dist', import.meta.url));

// Cada chamada monta um app novo, com os contadores de rate limit zerados (os testes usam isso).
export function criarApp() {
    const app = express();
    app.disable('x-powered-by'); // não anuncia o framework em toda resposta
    app.set('trust proxy', config.TRUST_PROXY); // req.ip do usuário real atrás do proxy do Render
    app.use(helmet()); // F16: CSP, HSTS, frame-ancestors etc. como cabeçalho HTTP
    app.use(limitar({ minutos: 1, maximo: 100 })); // O4: teto geral por IP
    // Antes das rotas: o site é público; só os dados exigem token. Em "/" entrega o index.html.
    app.use(express.static(FRONT));
    app.use(express.json())

    routes(app)

    app.use(tratarErros) // O1 e O2: sempre por último
    return app;
}

export default criarApp();
