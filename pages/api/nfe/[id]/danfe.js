import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export default async function handler(req, res) {
  try {
    const id = Number(req.query.id);

    const r = await pool.query(
      `SELECT chave_nfe FROM nfe_document WHERE id = $1`,
      [id]
    );

    if (!r.rowCount) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    const chave = r.rows[0].chave_nfe;

    const url = `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?chNFe=${chave}`;

    return res.status(200).json({ url });
  } catch (e) {
    return res.status(500).json({
      error: "Erro ao gerar DANFE",
      details: e.message,
    });
  }
}