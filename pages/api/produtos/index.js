import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT codigo_barra, descricao, preco FROM produto ORDER BY descricao"
    );
    return res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}