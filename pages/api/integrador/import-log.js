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
    tipo_importacao,
    referencia,
    status,
    mensagem,
    detalhes,
  } = req.body || {};

  if (!cliente_codigo || !tipo_importacao || !status) {
    return res.status(400).json({
      error: "cliente_codigo, tipo_importacao e status são obrigatórios",
    });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      INSERT INTO public.integrador_import_log (
        cliente_codigo,
        tipo_importacao,
        referencia,
        status,
        mensagem,
        detalhes,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW())
      RETURNING id
      `,
      [
        String(cliente_codigo).trim(),
        String(tipo_importacao).trim().toUpperCase(),
        referencia ? String(referencia) : null,
        String(status).trim().toUpperCase(),
        mensagem ? String(mensagem) : null,
        JSON.stringify(detalhes || {}),
      ]
    );

    return res.status(200).json({ success: true, id: result.rows[0]?.id || null });
  } catch (e) {
    console.error("Erro em /api/integrador/import-log:", e);
    return res.status(500).json({
      error: "Erro ao gravar log de importação",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}