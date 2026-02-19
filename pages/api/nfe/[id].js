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
    const idInt = Number.parseInt(id, 10);
    if (!Number.isFinite(idInt)) return res.status(400).json({ error: "ID inválido" });

    // Seleciona explicitamente os campos (melhor que SELECT *)
    const docRes = await pool.query(
      `
      SELECT
        id,
        chave_nfe,
        n_nf,
        serie,
        dh_emi,
        vnf,
        cnpj_emit,
        xnome_emit,
        cnpj_dest,
        xnome_dest,
        created_at,
        COALESCE(status_erp, 2) AS status_erp
      FROM nfe_document
      WHERE id = $1
      `,
      [idInt]
    );

    if (docRes.rowCount === 0) {
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    const itemRes = await pool.query(
      `
      SELECT
        id,
        nfe_id,
        n_item,
        cprod,
        xprod,
        ncm,
        cfop,
        ucom,
        qcom,
        vuncom,
        vprod
      FROM nfe_item
      WHERE nfe_id = $1
      ORDER BY n_item
      `,
      [idInt]
    );

    const payRes = await pool.query(
      `
      SELECT
        id,
        nfe_id,
        tpag,
        vpag,
        card_cnpj,
        card_tband
      FROM nfe_payment
      WHERE nfe_id = $1
      ORDER BY id
      `,
      [idInt]
    );

    return res.status(200).json({
      document: docRes.rows[0],
      items: itemRes.rows,
      payments: payRes.rows,
    });
  } catch (e) {
    return res.status(500).json({ error: "Erro interno", details: e?.message || String(e) });
  }
}
