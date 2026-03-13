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

    // 1) Seleciona e trava somente a fila
    const lockedRes = await client.query(
      `
      WITH locked_queue AS (
        SELECT
          q.id,
          q.nfe_id,
          q.pedido,
          q.origem_texto,
          q.status_integracao,
          q.mensagem_integracao,
          q.reservado_em,
          q.reservado_por,
          q.created_at,
          q.updated_at
        FROM public.erp_compra_queue q
        WHERE
          q.status_integracao IN (
            'PENDENTE',
            'ERRO',
            'SEM_PEDIDO',
            'FORNECEDOR_DIVERGENTE',
            'DEPARA_PENDENTE',
            'PEDIDO_NAO_ENCONTRADO',
            'FORNECEDOR_NAO_ENCONTRADO'
          )
          OR (
            q.status_integracao = 'PROCESSANDO'
            AND q.reservado_em IS NOT NULL
            AND q.reservado_em < NOW() - INTERVAL '1 minutes'
          )
        ORDER BY q.updated_at ASC, q.id ASC
        LIMIT $1
        FOR UPDATE OF q SKIP LOCKED
      )
      SELECT
        lq.id,
        lq.nfe_id,
        lq.pedido,
        lq.origem_texto,
        lq.status_integracao,
        lq.mensagem_integracao,
        lq.reservado_em,
        lq.reservado_por,
        lq.created_at,
        lq.updated_at,

        d.chave_nfe,
        d.cnpj_emit AS cnpj_fornecedor,
        d.cnpj_emit,
        d.xnome_emit AS fornecedor,
        d.xnome_emit,
        d.infcpl,
        d.infadfisco
      FROM locked_queue lq
      LEFT JOIN public.nfe_document d
        ON d.id = lq.nfe_id
      ORDER BY lq.updated_at ASC, lq.id ASC
      `,
      [limit]
    );

    const rows = lockedRes.rows || [];
    const selectedIds = rows.map((r) => r.id);

    // 2) Marca os registros selecionados como PROCESSANDO
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