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
  return !!API_TOKEN && token === API_TOKEN;
}

function toNullableNumber(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeBoolean(value) {
  if (value === true || value === false) return value;
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["true", "1", "sim", "yes"].includes(v)) return true;
    if (["false", "0", "nao", "não", "no"].includes(v)) return false;
  }

  return Boolean(value);
}

function normalizeText(value) {
  const s = String(value ?? "").trim();
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
    const body = req.body || {};

    const empresaId = toNullableNumber(body.empresa_id);
    const nfeId = toNullableNumber(body.nfe_id);

    const fornecedorExiste = normalizeBoolean(body.fornecedor_existe);
    const fornecedorCodigoErp = normalizeText(body.fornecedor_codigo_erp);

    const destinatarioExiste = normalizeBoolean(body.destinatario_existe);
    const destinatarioCodigoErp = normalizeText(body.destinatario_codigo_erp);

    const itensOk = normalizeBoolean(body.itens_ok);
    const pagamentosOk = normalizeBoolean(body.pagamentos_ok);

    const pendencias = Array.isArray(body.pendencias) ? body.pendencias : [];
    const avisos = Array.isArray(body.avisos) ? body.avisos : [];
    const itens = Array.isArray(body.itens) ? body.itens : [];

    let statusValidacao = normalizeText(body.status_validacao)?.toUpperCase() || null;
    let mensagem = normalizeText(body.mensagem);

    if (!empresaId || empresaId <= 0) {
      return res.status(400).json({ error: "empresa_id inválido" });
    }

    if (!nfeId || nfeId <= 0) {
      return res.status(400).json({ error: "nfe_id inválido" });
    }

    if (!statusValidacao) {
      statusValidacao = "VALIDADO_OK";

      if (fornecedorExiste === false) {
        statusValidacao = "PENDENTE_FORNECEDOR";
        mensagem = mensagem || "Fornecedor não encontrado no ERP";
      } else if (itensOk === false) {
        statusValidacao = "PENDENTE_ITEM";
        mensagem = mensagem || "Existem itens não encontrados no ERP";
      } else if (destinatarioExiste === false) {
        statusValidacao = "PENDENTE_DESTINATARIO";
        mensagem = mensagem || "Destinatário não encontrado no ERP";
      } else if (pendencias.length > 0) {
        statusValidacao = "PENDENTE";
        mensagem = mensagem || "Validação com pendências";
      }
    }

    const payloadJson = {
      empresa_id: empresaId,
      nfe_id: nfeId,
      fornecedor_existe: fornecedorExiste,
      fornecedor_codigo_erp: fornecedorCodigoErp,
      destinatario_existe: destinatarioExiste,
      destinatario_codigo_erp: destinatarioCodigoErp,
      itens_ok: itensOk,
      pagamentos_ok: pagamentosOk,
      status_validacao: statusValidacao,
      mensagem,
      pendencias,
      avisos,
      itens,
      pedido_relacionado: body.pedido_relacionado ?? null,
    };

    await client.query("BEGIN");

    const docRes = await client.query(
      `
      SELECT id, empresa_id
      FROM public.nfe_document
      WHERE id = $1
        AND empresa_id = $2
      LIMIT 1
      `,
      [nfeId, empresaId]
    );

    if (docRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "NF-e não encontrada para esta empresa",
      });
    }

    await client.query(
      `
      INSERT INTO public.nfe_erp_validacao (
        empresa_id,
        nfe_id,
        fornecedor_existe,
        fornecedor_codigo_erp,
        destinatario_existe,
        itens_ok,
        status_validacao,
        mensagem,
        payload_json,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), NOW()
      )
      ON CONFLICT (empresa_id, nfe_id)
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
        empresaId,
        nfeId,
        fornecedorExiste,
        fornecedorCodigoErp,
        destinatarioExiste,
        itensOk,
        statusValidacao,
        mensagem,
        JSON.stringify(payloadJson),
      ]
    );

    await client.query(
      `
      UPDATE public.nfe_document
      SET
        erp_validacao_status = $3,
        erp_validacao_msg = $4,
        erp_validado_em = NOW(),
        erp_fornecedor_existe = $5,
        erp_destinatario_existe = $6,
        erp_itens_ok = $7
      WHERE id = $1
        AND empresa_id = $2
      `,
      [
        nfeId,
        empresaId,
        statusValidacao,
        mensagem,
        fornecedorExiste,
        destinatarioExiste,
        itensOk,
      ]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      empresa_id: empresaId,
      nfe_id: nfeId,
      status_validacao: statusValidacao,
      mensagem,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Erro em /api/integracao/erp/validate-result:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao registrar validação ERP",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}