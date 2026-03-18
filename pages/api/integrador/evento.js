import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const API_TOKEN = process.env.ERP_INTEGRACAO_TOKEN || "";

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._integradorEventoPgPool;

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

  global._integradorEventoPgPool = pool;
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
    nivel,
    tipo_evento,
    mensagem,
    detalhes,
  } = req.body || {};

  const empresaId = toNullableNumber(empresa_id);
  const clienteCodigo = normalizeText(cliente_codigo);
  const nivelNorm = normalizeText(nivel);
  const tipoEvento = normalizeText(tipo_evento);
  const mensagemNorm = normalizeText(mensagem);

  if (!empresaId || empresaId <= 0) {
    return res.status(400).json({ error: "empresa_id é obrigatório" });
  }

  if (!clienteCodigo) {
    return res.status(400).json({ error: "cliente_codigo é obrigatório" });
  }

  if (!nivelNorm) {
    return res.status(400).json({ error: "nivel é obrigatório" });
  }

  if (!tipoEvento) {
    return res.status(400).json({ error: "tipo_evento é obrigatório" });
  }

  if (!mensagemNorm) {
    return res.status(400).json({ error: "mensagem é obrigatória" });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      INSERT INTO public.integrador_evento (
        empresa_id,
        cliente_codigo,
        nivel,
        tipo_evento,
        mensagem,
        detalhes,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
      `,
      [
        empresaId,
        clienteCodigo,
        nivelNorm.toUpperCase(),
        tipoEvento,
        mensagemNorm,
        detalhes != null ? String(detalhes) : null,
      ]
    );

    return res.status(200).json({
      success: true,
      id: result.rows[0]?.id || null,
      empresa_id: empresaId,
    });
  } catch (e) {
    console.error("Erro em /api/integrador/evento:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
    });

    return res.status(500).json({
      error: "Erro ao gravar evento",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}