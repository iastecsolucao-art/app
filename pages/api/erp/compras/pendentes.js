import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._erpPgPool;

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

  global._erpPgPool = pool;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1),
      200
    );

    const result = await pool.query(
      `
      SELECT
        pedido,
        emissao,
        tipo_compra,
        fornecedor_nome,
        status_sistema,
        created_at,
        updated_at
      FROM public.erp_compra_resumo
      WHERE COALESCE(status_integracao, 'PENDENTE') IN ('PENDENTE', 'ERRO')
      ORDER BY updated_at ASC, id ASC
      LIMIT $1
      `,
      [limit]
    );

    return res.status(200).json({
      rows: Array.isArray(result.rows) ? result.rows : [],
    });
  } catch (e) {
    console.error("Erro em GET /api/erp/compras/pendentes:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao buscar pedidos pendentes",
      details: e?.message || String(e),
    });
  }
}