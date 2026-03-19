import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const API_TOKEN = process.env.ERP_INTEGRACAO_TOKEN || "";

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._nfePgPoolAckError;

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

  global._nfePgPoolAckError = pool;
}

function checkAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return !!API_TOKEN && token === API_TOKEN;
}

function toNullableInt(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const n = Number.parseInt(String(value), 10);
  return Number.isInteger(n) ? n : null;
}

function normalizeText(value) {
  const s = String(value || "").trim();
  return s || null;
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
    const { empresa_id, nfe_id, erro, detalhes } = req.body || {};

    const empresaId = toNullableInt(empresa_id);
    const nfeId = toNullableInt(nfe_id);

    if (!empresaId || empresaId <= 0) {
      return res.status(400).json({ error: "empresa_id inválido" });
    }

    if (!nfeId || nfeId <= 0) {
      return res.status(400).json({ error: "nfe_id inválido" });
    }

    const mensagemErro =
      [normalizeText(erro), normalizeText(detalhes)]
        .filter(Boolean)
        .join(" | ") || "Erro desconhecido ao integrar no ERP";

    await client.query("BEGIN");

    const queueRes = await client.query(
      `
      UPDATE public.nfe_erp_queue
      SET
        status = 'ERRO',
        last_error = $3,
        tentativas = COALESCE(tentativas, 0) + 1,
        updated_at = NOW(),
        reservado_em = NULL,
        reservado_por = NULL
      WHERE nfe_id = $1
        AND empresa_id = $2
      RETURNING id, nfe_id, empresa_id, status, last_error
      `,
      [nfeId, empresaId, mensagemErro]
    );

    await client.query(
      `
      UPDATE public.nfe_document
      SET
        status_erp = 2,
        erp_stage_status = 'ERRO',
        erp_stage_msg = $3,
        erp_stage_updated_at = NOW()
      WHERE id = $1
        AND empresa_id = $2
      `,
      [nfeId, empresaId, mensagemErro]
    );

    await client
      .query(
        `
        INSERT INTO public.nfe_erp_log (
          nfe_id,
          empresa_id,
          tipo_evento,
          mensagem,
          detalhes,
          created_at
        )
        VALUES (
          $1,
          $2,
          'ERRO',
          $3,
          $4,
          NOW()
        )
        `,
        [
          nfeId,
          empresaId,
          normalizeText(erro) || "Erro na integração ERP",
          normalizeText(detalhes),
        ]
      )
      .catch(() => null);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      empresa_id: empresaId,
      nfe_id: nfeId,
      queue_updated: queueRes.rowCount > 0,
      status: "ERRO",
      status_erp: 2,
      last_error: mensagemErro,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Erro em POST /api/integracao/erp/ack-error:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao registrar falha da integração ERP",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}