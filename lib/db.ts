// lib/db.ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon no Vercel
});

export async function db<T = any>(query: string, params?: any[]): Promise<T[]> {
  const { rows } = await pool.query(query, params);
  return rows as T[];
}
