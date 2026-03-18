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
    nivel,
    tipo_evento,
    mensagem,
    detalhes,
  } = req.body || {};

  if (!cliente_codigo || !String(cliente_codigo).trim()) {
    return res.status(400).json({ error: "cliente_codigo é obrigatório" });
  }

  if (!nivel || !String(nivel).trim()) {
    return res.status(400).json({ error: "nivel é obrigatório" });
  }

  if (!tipo_evento || !String(tipo_evento).trim()) {
    return res.status(400).json({ error: "tipo_evento é obrigatório" });
  }

  if (!mensagem || !String(mensagem).trim()) {
    return res.status(400).json({ error: "mensagem é obrigatória" });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      INSERT INTO public.integrador_evento (
        cliente_codigo,
        nivel,
        tipo_evento,
        mensagem,
        detalhes,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,NOW())
      RETURNING id
      `,
      [
        String(cliente_codigo).trim(),
        String(nivel).trim().toUpperCase(),
        String(tipo_evento).trim(),
        String(mensagem),
        detalhes ? String(detalhes) : null,
      ]
    );

    return res.status(200).json({
      success: true,
      id: result.rows[0]?.id || null,
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