import pool from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await pool.query(`
        SELECT tipo, SUM(quantidade)::int AS total
        FROM estoque_movimento
        GROUP BY tipo
        ORDER BY total DESC;
      `);

      res.status(200).json(result.rows);
    } catch (err) {
      console.error("Erro API estoque_categorias:", err.message);
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}