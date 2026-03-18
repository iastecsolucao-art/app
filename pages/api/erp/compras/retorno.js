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

const ALLOWED_STATUS = new Set([
  "PENDENTE",
  "PROCESSANDO",
  "PRONTO_PARA_INTEGRAR",
  "PROCESSADO",
  "ERRO",
  "SEM_PEDIDO",
  "SEM_FORNECEDOR",
  "FORNECEDOR_DIVERGENTE",
  "DEPARA_PENDENTE",
  "ENTRADA_REALIZADA",
  "PEDIDO_NAO_LOCALIZADO",
  "FORNECEDOR_NAO_ENCONTRADO",
]);

function normalizeBody(body = {}) {
  const queueIdRaw = body.queue_id ?? body.id ?? null;
  const queue_id =
    queueIdRaw === null || queueIdRaw === undefined || String(queueIdRaw).trim() === ""
      ? null
      : Number.parseInt(String(queueIdRaw), 10);

  return {
    queue_id: Number.isInteger(queue_id) && queue_id > 0 ? queue_id : null,
    pedido: String(body.pedido || "").trim() || null,
    status: String(body.status || "").trim().toUpperCase(),
    message: body.message ? String(body.message).trim() : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  try {
    const data = normalizeBody(req.body);

    if (!data.queue_id && !data.pedido) {
      return res.status(400).json({
        error: "queue_id ou pedido é obrigatório",
      });
    }

    if (!ALLOWED_STATUS.has(data.status)) {
      return res.status(400).json({
        error: "status inválido",
        received: data.status,
        allowed: Array.from(ALLOWED_STATUS),
      });
    }

    let result;

    if (data.queue_id) {
      result = await pool.query(
        `
        UPDATE public.erp_compra_queue
        SET
          pedido = COALESCE($2, pedido),
          status_integracao = $3,
          mensagem_integracao = $4,
          reserved_by = NULL,
          reserved_at = NULL,
          updated_at = NOW()
        WHERE id = $1
        RETURNING
          id,
          nfe_id,
          pedido,
          status_integracao,
          mensagem_integracao,
          reserved_by,
          reserved_at,
          updated_at
        `,
        [data.queue_id, data.pedido, data.status, data.message]
      );
    } else {
      result = await pool.query(
        `
        UPDATE public.erp_compra_queue
        SET
          status_integracao = $1,
          mensagem_integracao = $2,
          reserved_by = NULL,
          reserved_at = NULL,
          updated_at = NOW()
        WHERE pedido = $3
        RETURNING
          id,
          nfe_id,
          pedido,
          status_integracao,
          mensagem_integracao,
          reserved_by,
          reserved_at,
          updated_at
        `,
        [data.status, data.message, data.pedido]
      );
    }

    if (!result.rowCount) {
      return res.status(404).json({
        error: "Registro não encontrado na fila",
        queue_id: data.queue_id,
        pedido: data.pedido,
      });
    }

    return res.status(200).json({
      success: true,
      rows: result.rows,
    });
  } catch (e) {
    console.error("Erro em POST /api/erp/compras/retorno:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao atualizar retorno do pedido",
      details: e?.message || String(e),
    });
  }
}