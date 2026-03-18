import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
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

  try {
    const {
      nfe_id,
      fornecedor_existe,
      fornecedor_codigo_erp,
      destinatario_existe,
      itens_ok,
      pendencias,
      itens,
    } = req.body || {};

    const nfeId = Number(nfe_id);

    if (!Number.isInteger(nfeId) || nfeId <= 0) {
      return res.status(400).json({ error: "nfe_id inválido" });
    }

    let status_validacao = "VALIDADO_OK";
    let mensagem = null;

    if (!fornecedor_existe) {
      status_validacao = "PENDENTE_FORNECEDOR";
      mensagem = "Fornecedor não encontrado no ERP";
    } else if (!itens_ok) {
      status_validacao = "PENDENTE_ITEM";
      mensagem = "Existem itens não encontrados no ERP";
    } else if (destinatario_existe === false) {
      status_validacao = "PENDENTE_DESTINATARIO";
      mensagem = "Destinatário não encontrado no ERP";
    }

    await pool.query(
      `
      INSERT INTO public.nfe_erp_validacao (
        nfe_id,
        fornecedor_existe,
        fornecedor_codigo_erp,
        destinatario_existe,
        itens_ok,
        status_validacao,
        mensagem,
        payload_json,
        updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      ON CONFLICT (nfe_id)
      DO UPDATE SET
        fornecedor_existe = EXCLUDED.fornecedor_existe,
        fornecedor_codigo_erp = EXCLUDED.fornecedor_codigo_erp,
        destinatario_existe = EXCLUDED.destinatario_existe,
        itens_ok = EXCLUDED.itens_ok,
        status_validacao = EXCLUDED.status_validacao,
        mensagem = EXCLUDED.mensagem,
        payload_json = EXCLUDED.payload_json,
        updated_at = NOW()
      `,
      [
        nfeId,
        fornecedor_existe ?? null,
        fornecedor_codigo_erp ?? null,
        destinatario_existe ?? null,
        itens_ok ?? null,
        status_validacao,
        mensagem,
        JSON.stringify({
          pendencias: Array.isArray(pendencias) ? pendencias : [],
          itens: Array.isArray(itens) ? itens : [],
        }),
      ]
    );

    return res.status(200).json({
      success: true,
      nfe_id: nfeId,
      status_validacao,
      mensagem,
    });
  } catch (e) {
    return res.status(500).json({
      error: "Erro ao registrar validação ERP",
      details: e?.message || String(e),
    });
  }
}