import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  try {
    const { id } = req.query;
    const idInt = parseInt(id, 10);
    if (Number.isNaN(idInt)) return res.status(400).json({ error: "ID inválido" });

    const docRes = await pool.query(`SELECT * FROM nfe_document WHERE id = $1`, [idInt]);
    if (docRes.rowCount === 0) return res.status(404).json({ error: "Documento não encontrado" });

    const itemRes = await pool.query(
      `SELECT * FROM nfe_item WHERE nfe_id = $1 ORDER BY n_item`,
      [idInt]
    );

    const payRes = await pool.query(
      `SELECT * FROM nfe_payment WHERE nfe_id = $1`,
      [idInt]
    );

    return res.status(200).json({
      document: docRes.rows[0],
      items: itemRes.rows,
      payments: payRes.rows,
    });
  } catch (e) {
    return res.status(500).json({ error: "Erro interno", details: e.message });
  }
}
