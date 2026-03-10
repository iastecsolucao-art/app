import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool;

if (!global._nfePgPool) {
  global._nfePgPool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
}

pool = global._nfePgPool;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  try {
    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const idInt = Number.parseInt(String(rawId), 10);

    if (!Number.isInteger(idInt) || idInt <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

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
      LIMIT 1
      `,
      [idInt]
    );

    if (docRes.rowCount === 0) {
      return res.status(404).json({
        error: "Documento não encontrado",
      });
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
      ORDER BY n_item ASC, id ASC
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
      ORDER BY id ASC
      `,
      [idInt]
    );

    return res.status(200).json({
      document: docRes.rows[0] || {},
      items: Array.isArray(itemRes.rows) ? itemRes.rows : [],
      payments: Array.isArray(payRes.rows) ? payRes.rows : [],
    });
  } catch (e) {
    console.error("Erro em GET /api/nfe/[id]:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro interno ao buscar detalhes da NFe",
      details: e?.message || String(e),
    });
  }
}