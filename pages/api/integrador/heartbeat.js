import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const API_TOKEN = process.env.ERP_INTEGRACAO_TOKEN || "";

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._integradorHeartbeatPgPool;

if (!pool) {
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  global._integradorHeartbeatPgPool = pool;
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
    versao_integrador,
    hostname,
    ip_local,
    status,
    mensagem,
    nfe_processadas,
    compras_processadas,
    tempo_ciclo_ms,
  } = req.body || {};

  const empresaId = toNullableNumber(empresa_id);
  const clienteCodigo = normalizeText(cliente_codigo);
  const versaoIntegrador = normalizeText(versao_integrador);
  const hostnameNorm = normalizeText(hostname);
  const ipLocalNorm = normalizeText(ip_local);
  const statusNorm = normalizeText(status);
  const mensagemNorm = normalizeText(mensagem);
  const nfeProcessadas = toNullableNumber(nfe_processadas) ?? 0;
  const comprasProcessadas = toNullableNumber(compras_processadas) ?? 0;
  const tempoCicloMs = toNullableNumber(tempo_ciclo_ms);

  if (!empresaId || empresaId <= 0) {
    return res.status(400).json({ error: "empresa_id é obrigatório" });
  }

  if (!clienteCodigo || !statusNorm) {
    return res.status(400).json({
      error: "empresa_id, cliente_codigo e status são obrigatórios",
    });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      INSERT INTO public.integrador_heartbeat (
        empresa_id,
        cliente_codigo,
        versao_integrador,
        hostname,
        ip_local,
        status,
        mensagem,
        nfe_processadas,
        compras_processadas,
        tempo_ciclo_ms,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      RETURNING id
      `,
      [
        empresaId,
        clienteCodigo,
        versaoIntegrador,
        hostnameNorm,
        ipLocalNorm,
        statusNorm.toUpperCase(),
        mensagemNorm,
        nfeProcessadas,
        comprasProcessadas,
        tempoCicloMs,
      ]
    );

    return res.status(200).json({
      success: true,
      id: result.rows[0]?.id || null,
      empresa_id: empresaId,
    });
  } catch (e) {
    console.error("Erro em /api/integrador/heartbeat:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
    });

    return res.status(500).json({
      error: "Erro ao gravar heartbeat",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}