import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;
const API_TOKEN = process.env.ERP_INTEGRACAO_TOKEN || "";

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._integradorPgPool;

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

  global._integradorPgPool = pool;
}

function checkAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return !!API_TOKEN && token === API_TOKEN;
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

  if (!cliente_codigo || !String(cliente_codigo).trim()) {
    return res.status(400).json({ error: "cliente_codigo é obrigatório" });
  }

  if (!status || !String(status).trim()) {
    return res.status(400).json({ error: "status é obrigatório" });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      INSERT INTO public.integrador_heartbeat (
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
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()
      )
      RETURNING id
      `,
      [
        String(cliente_codigo).trim(),
        versao_integrador ? String(versao_integrador).trim() : null,
        hostname ? String(hostname).trim() : null,
        ip_local ? String(ip_local).trim() : null,
        String(status).trim().toUpperCase(),
        mensagem ? String(mensagem) : null,
        Number.isFinite(Number(nfe_processadas)) ? Number(nfe_processadas) : 0,
        Number.isFinite(Number(compras_processadas)) ? Number(compras_processadas) : 0,
        Number.isFinite(Number(tempo_ciclo_ms)) ? Number(tempo_ciclo_ms) : null,
      ]
    );

    return res.status(200).json({
      success: true,
      id: result.rows[0]?.id || null,
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