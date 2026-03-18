import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const API_TOKEN = process.env.ERP_INTEGRACAO_TOKEN || "";

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._integradorImportLogPgPool;

if (!pool) {
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  global._integradorImportLogPgPool = pool;
}

function checkAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return !!API_TOKEN && token === API_TOKEN;
}

function normalizeText(value) {
  const s = String(value || "").trim();
  return s || null;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const {
    empresa_id,
    cliente_codigo,
    tipo_importacao,
    referencia,
    status,
    mensagem,
    detalhes,
  } = req.body || {};

  const empresaId = toNullableNumber(empresa_id);
  const clienteCodigo = normalizeText(cliente_codigo);
  const tipoImportacao = normalizeText(tipo_importacao);
  const statusNorm = normalizeText(status);
  const referenciaNorm = normalizeText(referencia);
  const mensagemNorm = normalizeText(mensagem);

  if (!empresaId || empresaId <= 0) {
    return res.status(400).json({
      error: "empresa_id é obrigatório",
    });
  }

  if (!clienteCodigo || !tipoImportacao || !statusNorm) {
    return res.status(400).json({
      error: "empresa_id, cliente_codigo, tipo_importacao e status são obrigatórios",
    });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      INSERT INTO public.integrador_import_log (
        empresa_id,
        cliente_codigo,
        tipo_importacao,
        referencia,
        status,
        mensagem,
        detalhes,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
      RETURNING id
      `,
      [
        empresaId,
        clienteCodigo,
        tipoImportacao.toUpperCase(),
        referenciaNorm,
        statusNorm.toUpperCase(),
        mensagemNorm,
        JSON.stringify(detalhes || {}),
      ]
    );

    return res.status(200).json({
      success: true,
      id: result.rows[0]?.id || null,
      empresa_id: empresaId,
    });
  } catch (e) {
    console.error("Erro em /api/integrador/import-log:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
    });

    return res.status(500).json({
      error: "Erro ao gravar log de importação",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}