// lib/db.ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Em Neon/Vercel não use SSL strict se já vem no URL
  // ssl: { rejectUnauthorized: false }
});

export async function dbQuery<T = any>(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return res;
  } finally {
    client.release();
  }
}
