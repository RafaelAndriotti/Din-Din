import PG from "pg";
import { config } from "../config.js";

const { Pool } = PG

// A API conecta com a role da aplicação (APP_DB_USER), sem superusuário, e não com o admin do contêiner (F04).
const pool = new Pool({
    host: config.POSTGRES_HOST,
    port: config.POSTGRES_PORT,
    user: config.APP_DB_USER,
    password: config.APP_DB_PASSWORD,
    database: config.POSTGRES_DB
});

export default pool;
