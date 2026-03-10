import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export default async function handler(req, res) {
  try {
    const id = Number(req.query.id);

    const r = await pool.query(
      `SELECT chave_nfe, xml_raw FROM nfe_document WHERE id = $1`,
      [id]
    );

    if (!r.rowCount) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    const row = r.rows[0];

    res.setHeader("Content-Type", "application/xml");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="nfe-${row.chave_nfe}.xml"`
    );

    return res.send(row.xml_raw);
  } catch (e) {
    return res.status(500).json({
      error: "Erro ao baixar XML",
      details: e.message,
    });
  }
}