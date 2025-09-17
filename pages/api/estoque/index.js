import pool from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await pool.query(`
        SELECT p.descricao,
               COALESCE(SUM(CASE WHEN em.tipo='entrada' THEN em.quantidade ELSE -em.quantidade END),0) AS saldo,
               ROUND(AVG(CASE WHEN em.tipo='entrada' THEN em.custo ELSE NULL END),2) AS custo_medio
        FROM produtos p
        LEFT JOIN estoque_movimentos em ON em.produto_id = p.id
        GROUP BY p.id
        ORDER BY p.descricao;
      `);
      res.status(200).json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}