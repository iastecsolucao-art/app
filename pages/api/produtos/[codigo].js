import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  const { codigo } = req.query;
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT codigo_barra, descricao, preco FROM produto WHERE codigo_barra = $1",
      [codigo]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}