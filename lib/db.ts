// lib/db.ts
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

const pool =
  global._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Se o seu DATABASE_URL não tem sslmode=require, habilite ssl manualmente:
    // ssl: { rejectUnauthorized: false },
  });

if (!global._pgPool) global._pgPool = pool;

export async function dbQuery<T = any>(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return res; // ou res.rows, se preferir
  } finally {
    client.release();
  }
}

export { pool };
