import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const API_TOKEN = process.env.ERP_INTEGRACAO_TOKEN || "";

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._nfePgPoolStageResult;

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

  global._nfePgPoolStageResult = pool;
}

function checkAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return !!API_TOKEN && token === API_TOKEN;
}

function normalizeText(v) {
  const s = String(v || "").trim();
  return s || null;
}

function toNullableInt(v) {
  if (v === undefined || v === null || String(v).trim() === "") {
    return null;
  }

  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

function mapStatusErp(statusStage, currentStatusErp) {
  const s = String(statusStage || "").trim().toUpperCase();

  if (s === "INTEGRADO") return 3;

  if (
    s === "INTEGRADO_DIVERGENCIA" ||
    s === "INTEGRADO_DIVERGENCIA_QTD" ||
    s === "INTEGRADO_DIVERGENCIA_VALOR" ||
    s === "INTEGRADO_DIVERGENCIA_QTD_VALOR"
  ) {
    return 5;
  }

  if (
    s === "ERRO" ||
    s === "DUPLICADA" ||
    s === "DUPLICADA_STAGE"
  ) {
    return 4;
  }

  if (s === "PROCESSANDO") return 1;
  if (s === "PENDENTE") return 2;

  return currentStatusErp ?? 2;
}

function isIntegratedStatus(statusStage) {
  const s = String(statusStage || "").trim().toUpperCase();

  return (
    s === "INTEGRADO" ||
    s === "INTEGRADO_DIVERGENCIA" ||
    s === "INTEGRADO_DIVERGENCIA_QTD" ||
    s === "INTEGRADO_DIVERGENCIA_VALOR" ||
    s === "INTEGRADO_DIVERGENCIA_QTD_VALOR"
  );
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
    const body = req.body || {};

    const empresa_id = toNullableInt(body.empresa_id);
    const nfe_id = toNullableInt(body.nfe_id);
    const integracao_id = normalizeText(body.integracao_id);
    const status_stage = normalizeText(body.status_stage);
    const mensagem_retorno = normalizeText(body.mensagem_retorno);

    if (!empresa_id || empresa_id <= 0) {
      return res.status(400).json({ error: "empresa_id inválido" });
    }

    if (!nfe_id || nfe_id <= 0) {
      return res.status(400).json({ error: "nfe_id inválido" });
    }

    if (!status_stage) {
      return res.status(400).json({ error: "status_stage é obrigatório" });
    }

    await client.query("BEGIN");

    const currentRes = await client.query(
      `
      SELECT
        id,
        empresa_id,
        chave_nfe,
        status_erp,
        erp_stage_status,
        erp_stage_msg,
        erp_integracao_id,
        erp_stage_updated_at,
        erp_integrado_em
      FROM public.nfe_document
      WHERE id = $1
        AND empresa_id = $2
      LIMIT 1
      `,
      [nfe_id, empresa_id]
    );

    if (currentRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "NF-e não encontrada em nfe_document para esta empresa",
      });
    }

    const current = currentRes.rows[0];
    const novo_status_erp = mapStatusErp(status_stage, current.status_erp);
    const integrated = isIntegratedStatus(status_stage);

    const updateRes = await client.query(
      `
      UPDATE public.nfe_document
      SET
        status_erp = $3,
        erp_stage_status = $4,
        erp_stage_msg = $5,
        erp_integracao_id = COALESCE($6, erp_integracao_id),
        erp_stage_updated_at = NOW(),
        erp_integrado_em = CASE
          WHEN $7 = true THEN NOW()
          ELSE erp_integrado_em
        END
      WHERE id = $1
        AND empresa_id = $2
      RETURNING
        id,
        empresa_id,
        chave_nfe,
        status_erp,
        erp_stage_status,
        erp_stage_msg,
        erp_integracao_id,
        erp_stage_updated_at,
        erp_integrado_em
      `,
      [
        nfe_id,
        empresa_id,
        novo_status_erp,
        status_stage,
        mensagem_retorno,
        integracao_id,
        integrated,
      ]
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
          'STAGE_RESULT',
          $3,
          $4,
          NOW()
        )
        `,
        [
          empresa_id,
          nfe_id,
          `Retorno da stage: ${status_stage}`,
          mensagem_retorno || integracao_id || null,
        ]
      )
      .catch(() => null);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      document: updateRes.rows[0],
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Erro em POST /api/integracao/erp/stage-result:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao atualizar retorno da stage no nfe_document",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}