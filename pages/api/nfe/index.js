import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._nfePgPool;

if (!pool) {
  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  global._nfePgPool = pool;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  try {
    const rawQ = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const rawStatus = Array.isArray(req.query.status_erp)
      ? req.query.status_erp[0]
      : req.query.status_erp;

    const query = String(rawQ || "").trim();
    const like = `%${query}%`;

    const lim = Math.min(Math.max(parseInt(String(rawLimit || "50"), 10) || 50, 1), 200);

    const params = [];
    const where = [];

    if (query) {
      params.push(like);
      const p = `$${params.length}`;

      where.push(`
        (
          chave_nfe ILIKE ${p}
          OR n_nf ILIKE ${p}
          OR serie ILIKE ${p}
          OR xnome_emit ILIKE ${p}
          OR cnpj_emit ILIKE ${p}
          OR xnome_dest ILIKE ${p}
          OR cnpj_dest ILIKE ${p}
        )
      `);
    }

    if (rawStatus !== undefined && rawStatus !== null && String(rawStatus).trim() !== "") {
      const statusInt = parseInt(String(rawStatus), 10);

      if (!Number.isInteger(statusInt) || ![1, 2, 3].includes(statusInt)) {
        return res.status(400).json({
          error: "status_erp inválido",
        });
      }

      params.push(statusInt);
      where.push(`COALESCE(status_erp, 2) = $${params.length}`);
    }

    params.push(lim);
    const limitParam = `$${params.length}`;

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await pool.query(
      `
      SELECT
        id,
        chave_nfe,
        n_nf,
        serie,
        dh_emi,
        xnome_emit,
        cnpj_emit,
        xnome_dest,
        cnpj_dest,
        vnf,
        created_at,
        COALESCE(status_erp, 2) AS status_erp
      FROM nfe_document
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ${limitParam}
      `,
      params
    );

    return res.status(200).json({
      rows: Array.isArray(result.rows) ? result.rows : [],
    });
  } catch (e) {
    console.error("Erro em GET /api/nfe:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro interno ao listar NFes",
      details: e?.message || String(e),
    });
  }
}