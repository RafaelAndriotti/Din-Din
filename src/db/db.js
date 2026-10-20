import 'dotenv/config'//Carrega todas as variaveis do .env para o process.env
import pool from "pg";

const pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: process.env.POSTGRES_PORT || 5434,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

export default pool;