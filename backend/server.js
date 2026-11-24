import 'dotenv/config'
import { config } from './src/config.js'
import app from './src/app.js'

// Padrão 127.0.0.1: só a própria máquina alcança a API (F05). Abrir para a rede (HOST=0.0.0.0)
// só com um proxy com TLS na frente, como o do Render.
app.listen(config.PORT, config.HOST, () => {
    console.log(`Servidor rodando em http://${config.HOST}:${config.PORT}`)
})
