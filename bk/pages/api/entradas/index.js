import pool from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const result = await pool.query(
        `SELECT em.id, p.descricao as produto, em.quantidade, em.custo,
                em.data_movimento, em.referencia
         FROM estoque_movimentos em
         JOIN produtos p ON p.id = em.produto_id
         WHERE em.tipo = 'entrada'
         ORDER BY em.data_movimento DESC`
      );
      res.status(200).json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}