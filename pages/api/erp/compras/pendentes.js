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

  const client = await pool.connect();

  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1),
      200
    );

    const reservadoPor = "python-compras";

    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT
        id,
        pedido,
        origem_texto,
        status_integracao,
        mensagem_integracao,
        reservado_em,
        reservado_por,
        created_at,
        updated_at
      FROM public.erp_compra_queue
      WHERE
        status_integracao IN ('PENDENTE', 'ERRO')
        OR (
          status_integracao = 'PROCESSANDO'
          AND reservado_em IS NOT NULL
          AND reservado_em < NOW() - INTERVAL '1 minutes'
        )
      ORDER BY updated_at ASC, id ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
      `,
      [limit]
    );

    const rows = result.rows || [];

    const selectedIds = rows.map((r) => r.id);

    if (selectedIds.length > 0) {
      await client.query(
        `
        UPDATE public.erp_compra_queue
        SET
          status_integracao = 'PROCESSANDO',
          reservado_em = NOW(),
          reservado_por = $2,
          updated_at = NOW()
        WHERE id = ANY($1::bigint[])
        `,
        [selectedIds, reservadoPor]
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      rows: rows.map((r) => ({
        ...r,
        status_integracao: "PROCESSANDO",
        reservado_por: reservadoPor,
      })),
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

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
  } finally {
    client.release();
  }
}