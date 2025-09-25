import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

export default async function handler(req, res) {
  try {
    const result = await pool.query("SELECT DISTINCT seller_name FROM view_vendas_completa ORDER BY seller_name");
    const vendedores = result.rows.map((r) => r.seller_name);
    res.status(200).json(vendedores);
  } catch (error) {
    console.error("Erro ao buscar vendedores:", error);
    res.status(500).json({ error: "Erro interno" });
  }
}