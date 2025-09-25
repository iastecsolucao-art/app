import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

export default async function handler(req, res) {
  try {
    const result = await pool.query("SELECT DISTINCT loja FROM metas_lojas ORDER BY loja");
    const lojas = result.rows.map((r) => r.loja);
    res.status(200).json(lojas);
  } catch (error) {
    console.error("Erro ao buscar lojas:", error);
    res.status(500).json({ error: "Erro interno" });
  }
}