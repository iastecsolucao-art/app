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
    const { q = "", limit = "50" } = req.query;
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

    const query = q.toString().trim();
    const like = `%${query}%`;

    const result = await pool.query(
      `
        SELECT
          id, chave_nfe, n_nf, serie, dh_emi,
          xnome_emit, cnpj_emit,
          xnome_dest, cnpj_dest,
          vnf, created_at
        FROM nfe_document
        WHERE
          ($1 = '' OR chave_nfe ILIKE $2 OR n_nf ILIKE $2 OR xnome_emit ILIKE $2 OR xnome_dest ILIKE $2)
        ORDER BY created_at DESC
        LIMIT $3
      `,
      [query, like, lim]
    );

    return res.status(200).json({ rows: result.rows });
  } catch (e) {
    return res.status(500).json({ error: "Erro interno", details: e.message });
  }
}
