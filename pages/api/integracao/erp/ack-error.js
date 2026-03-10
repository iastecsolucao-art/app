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
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  global._nfePgPool = pool;
}

function checkAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return API_TOKEN && token === API_TOKEN;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const { nfe_id, erro, detalhes } = req.body || {};
  const nfeId = Number(nfe_id);

  if (!Number.isInteger(nfeId) || nfeId <= 0) {
    return res.status(400).json({ error: "nfe_id inválido" });
  }

  try {
    await pool.query(
      `
      UPDATE public.nfe_erp_queue
      SET
        status = 'ERRO',
        last_error = $2,
        updated_at = NOW()
      WHERE nfe_id = $1
      `,
      [nfeId, [erro, detalhes].filter(Boolean).join(" | ")]
    );

    await pool.query(
      `
      UPDATE public.nfe_document
      SET status_erp = 2
      WHERE id = $1
      `,
      [nfeId]
    );

    return res.status(200).json({
      success: true,
      nfe_id: nfeId,
      message: "Erro registrado com sucesso",
    });
  } catch (e) {
    return res.status(500).json({
      error: "Erro ao registrar falha da integração",
      details: e?.message || String(e),
    });
  }
}