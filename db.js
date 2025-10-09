import { Pool } from "pg";

// ⚠️ Certifique-se de configurar DATABASE_URL no seu .env.local
// Exemplo: postgresql://usuario:senha@host:5432/seubanco

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export default pool;