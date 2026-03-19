import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const API_TOKEN = process.env.ERP_INTEGRACAO_TOKEN || "";

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._nfePgPoolAckSuccess;

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

  global._nfePgPoolAckSuccess = pool;
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

  const n = Number(value);
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
    const { empresa_id, nfe_id, mensagem, protocolo_cliente } = req.body || {};

    const empresaId = toNullableInt(empresa_id);
    const nfeId = toNullableInt(nfe_id);
    const msg = normalizeText(mensagem) || "Integração concluída com sucesso";
    const protocolo = normalizeText(protocolo_cliente);

    if (!empresaId || empresaId <= 0) {
      return res.status(400).json({ error: "empresa_id inválido" });
    }

    if (!nfeId || nfeId <= 0) {
      return res.status(400).json({ error: "nfe_id inválido" });
    }

    await client.query("BEGIN");

    const docCheck = await client.query(
      `
      SELECT id, empresa_id, chave_nfe, n_nf, serie
      FROM public.nfe_document
      WHERE id = $1
        AND empresa_id = $2
      LIMIT 1
      `,
      [nfeId, empresaId]
    );

    if (docCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "NF-e não encontrada para esta empresa",
      });
    }

    const queueRes = await client.query(
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
        AND empresa_id = $2
      RETURNING id, nfe_id, empresa_id
      `,
      [nfeId, empresaId]
    );

    await client.query(
      `
      UPDATE public.nfe_document
      SET
        status_erp = 3,
        erp_stage_status = 'INTEGRADO',
        erp_stage_msg = $3,
        erp_integrado_em = NOW(),
        erp_stage_updated_at = NOW()
      WHERE id = $1
        AND empresa_id = $2
      `,
      [nfeId, empresaId, msg]
    );

    await client
      .query(
        `
        INSERT INTO public.nfe_erp_log (
          empresa_id,
          nfe_id,
          tipo_evento,
          mensagem,
          detalhes,
          created_at
        )
        VALUES (
          $1,
          $2,
          'SUCESSO',
          $3,
          $4,
          NOW()
        )
        `,
        [empresaId, nfeId, msg, protocolo]
      )
      .catch(() => null);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      empresa_id: empresaId,
      nfe_id: nfeId,
      status: "INTEGRADO",
      status_erp: 3,
      queue_updated: queueRes.rowCount > 0,
      integrado_em: new Date().toISOString(),
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