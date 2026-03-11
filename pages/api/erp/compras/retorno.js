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

function normalizeBody(body = {}) {
  return {
    pedido: String(body.pedido || "").trim(),
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

    if (!data.pedido) {
      return res.status(400).json({ error: "pedido é obrigatório" });
    }

    if (!["PENDENTE", "PROCESSADO", "ERRO"].includes(data.status)) {
      return res.status(400).json({ error: "status inválido" });
    }

    const result = await pool.query(
      `
      UPDATE public.erp_compra_queue
      SET
        status_integracao = $1,
        mensagem_integracao = $2,
        updated_at = NOW()
      WHERE pedido = $3
      RETURNING
        id,
        nfe_id,
        chave_nfe,
        pedido,
        status_integracao,
        mensagem_integracao,
        updated_at
      `,
      [data.status, data.message, data.pedido]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Pedido não encontrado na fila" });
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