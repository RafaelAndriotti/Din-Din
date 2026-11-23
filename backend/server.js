import 'dotenv/config'
import app from './src/app.js'

const PORT = process.env.PORT || 3000
// Só a própria máquina alcança a API (F05). Abrir para a rede só com um proxy com TLS na frente.
const HOST = '127.0.0.1'

app.listen(PORT, HOST, () => {
    console.log(`Servidor rodando em http://${HOST}:${PORT}`)
})
