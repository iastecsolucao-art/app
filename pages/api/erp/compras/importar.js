import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._erpPgPool;

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

  global._erpPgPool = pool;
}

function toText(v) {
  return v == null ? null : String(v).trim();
}

function toNumber(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  try {
    const body = req.body || {};
    const pedido = toText(body.pedido);

    if (!pedido) {
      return res.status(400).json({ error: "pedido é obrigatório" });
    }

    const result = await pool.query(
      `
      INSERT INTO public.erp_compra_resumo (
        pedido,
        emissao,
        tipo_compra,
        natureza_operacao,
        fornecedor_nome,
        condicao_pagamento,
        comprador,
        status_sistema,
        doc_alcada,
        lista_itens,
        valor_total_pedido,
        centros_de_custo,
        contas_contabeis,
        obs_geral,
        justificativa_itens,
        aprovadores_na_alcada,
        assinaturas_concluidas,
        log_trilha_status,
        origem_sistema,
        payload_json,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW()
      )
      ON CONFLICT (pedido)
      DO UPDATE SET
        emissao = EXCLUDED.emissao,
        tipo_compra = EXCLUDED.tipo_compra,
        natureza_operacao = EXCLUDED.natureza_operacao,
        fornecedor_nome = EXCLUDED.fornecedor_nome,
        condicao_pagamento = EXCLUDED.condicao_pagamento,
        comprador = EXCLUDED.comprador,
        status_sistema = EXCLUDED.status_sistema,
        doc_alcada = EXCLUDED.doc_alcada,
        lista_itens = EXCLUDED.lista_itens,
        valor_total_pedido = EXCLUDED.valor_total_pedido,
        centros_de_custo = EXCLUDED.centros_de_custo,
        contas_contabeis = EXCLUDED.contas_contabeis,
        obs_geral = EXCLUDED.obs_geral,
        justificativa_itens = EXCLUDED.justificativa_itens,
        aprovadores_na_alcada = EXCLUDED.aprovadores_na_alcada,
        assinaturas_concluidas = EXCLUDED.assinaturas_concluidas,
        log_trilha_status = EXCLUDED.log_trilha_status,
        origem_sistema = EXCLUDED.origem_sistema,
        payload_json = EXCLUDED.payload_json,
        updated_at = NOW()
      RETURNING id, pedido
      `,
      [
        pedido,
        body.emissao || null,
        toText(body.tipo_compra),
        toText(body.natureza_operacao),
        toText(body.fornecedor_nome),
        toText(body.condicao_pagamento),
        toText(body.comprador),
        toText(body.status_sistema),
        toText(body.doc_alcada),
        toText(body.lista_itens),
        toNumber(body.valor_total_pedido),
        toText(body.centros_de_custo),
        toText(body.contas_contabeis),
        toText(body.obs_geral),
        toText(body.justificativa_itens),
        toText(body.aprovadores_na_alcada),
        toText(body.assinaturas_concluidas),
        toText(body.log_trilha_status),
        toText(body.origem_sistema) || "LINX",
        body.payload_json || body,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Resumo do pedido importado com sucesso",
      pedido: result.rows[0].pedido,
      id: result.rows[0].id,
    });
  } catch (e) {
    console.error("Erro em POST /api/erp/compras/importar:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao importar resumo do pedido",
      details: e?.message || String(e),
    });
  }
}