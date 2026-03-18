import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  try {
    const q = String(req.query.q || "").trim();
    const status = String(req.query.status || "").trim();
    const comprador = String(req.query.comprador || "").trim();
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 200);

    const params = [];
    const where = [];

    if (q) {
      params.push(`%${q}%`);
      where.push(`(
        pedido ILIKE $${params.length}
        OR COALESCE(fornecedor_nome, '') ILIKE $${params.length}
        OR COALESCE(natureza_operacao, '') ILIKE $${params.length}
        OR COALESCE(lista_itens, '') ILIKE $${params.length}
      )`);
    }

    if (status) {
      params.push(`%${status}%`);
      where.push(`COALESCE(status_sistema, '') ILIKE $${params.length}`);
    }

    if (comprador) {
      params.push(`%${comprador}%`);
      where.push(`COALESCE(comprador, '') ILIKE $${params.length}`);
    }

    params.push(limit);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await pool.query(
      `
      SELECT
        id,
        pedido,
        emissao,
        tipo_compra,
        natureza_operacao,
        fornecedor_nome,
        condicao_pagamento,
        comprador,
        status_sistema,
        doc_alcada,
        valor_total_pedido,
        aprovadores_na_alcada,
        assinaturas_concluidas,
        created_at,
        updated_at
      FROM public.erp_compra_resumo
      ${whereSql}
      ORDER BY updated_at DESC, id DESC
      LIMIT $${params.length}
      `,
      params
    );

    return res.status(200).json({ rows: result.rows });
  } catch (e) {
    return res.status(500).json({
      error: "Erro ao listar resumos de compras",
      details: e?.message || String(e),
    });
  }
}