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

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  try {
    const pedido = Array.isArray(req.query.pedido) ? req.query.pedido[0] : req.query.pedido;

    if (!pedido) {
      return res.status(400).json({ error: "Pedido inválido" });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM public.erp_compra_resumo
      WHERE pedido = $1
      LIMIT 1
      `,
      [pedido]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (e) {
    return res.status(500).json({
      error: "Erro ao buscar detalhe do pedido",
      details: e?.message || String(e),
    });
  }
}