import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;
const API_TOKEN = process.env.ERP_INTEGRACAO_TOKEN || "";

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

function checkAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return !!API_TOKEN && token === API_TOKEN;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const client = await pool.connect();

  try {
    const { nfe_id, mensagem, protocolo_cliente } = req.body || {};
    const nfeId = Number(nfe_id);

    if (!Number.isInteger(nfeId) || nfeId <= 0) {
      return res.status(400).json({ error: "nfe_id inválido" });
    }

    await client.query("BEGIN");

    await client.query(
      `
      UPDATE public.nfe_erp_queue
      SET
        status = 'INTEGRADO',
        integrado_em = NOW(),
        updated_at = NOW(),
        last_error = NULL,
        reservado_em = NULL,
        reservado_por = NULL
      WHERE nfe_id = $1
      `,
      [nfeId]
    );

    await client.query(
      `
      UPDATE public.nfe_document
      SET status_erp = 3
      WHERE id = $1
      `,
      [nfeId]
    );

    await client.query(
      `
      INSERT INTO public.nfe_erp_log (
        nfe_id,
        tipo_evento,
        mensagem,
        detalhes,
        created_at
      )
      VALUES (
        $1,
        'SUCESSO',
        $2,
        $3,
        NOW()
      )
      `,
      [nfeId, mensagem || "Integração concluída com sucesso", protocolo_cliente || null]
    ).catch(() => null);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      nfe_id: nfeId,
      status: "INTEGRADO",
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Erro em POST /api/integracao/erp/ack-success:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao confirmar sucesso da integração ERP",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}