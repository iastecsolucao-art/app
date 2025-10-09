// lib/db.ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // se estiver em provedor que exige SSL (Neon/Render/Heroku/etc)
  ssl: { rejectUnauthorized: false },
});

// Conveniência: execute consultas com pool gerenciado.
export async function dbQuery<T = any>(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query<T>(text, params);
    return result; // { rows, rowCount, ... }
  } finally {
    client.release();
  }
}
