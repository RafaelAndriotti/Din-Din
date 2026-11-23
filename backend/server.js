import 'dotenv/config'
import { config } from './src/config.js'
import app from './src/app.js'

// Só a própria máquina alcança a API (F05). Abrir para a rede só com um proxy com TLS na frente.
const HOST = '127.0.0.1'

app.listen(config.PORT, HOST, () => {
    console.log(`Servidor rodando em http://${HOST}:${config.PORT}`)
})
