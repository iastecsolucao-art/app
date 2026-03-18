import { Pool } from "pg";
import {
  extractPedidosFromText,
  buildObservationText,
} from "./_pedido-utils";

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
  if (!["POST", "GET"].includes(req.method)) {
    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "200"), 10) || 200, 1),
      2000
    );

    const docsRes = await pool.query(
      `
      SELECT
        id,
        chave_nfe,
        infcpl,
        obscont_xtexto,
        infadfisco,
        created_at
      FROM public.nfe_document
      ORDER BY id DESC
      LIMIT $1
      `,
      [limit]
    );

    const rows = Array.isArray(docsRes.rows) ? docsRes.rows : [];
    let inserted = 0;
    let scanned = 0;
    const details = [];

    for (const doc of rows) {
      scanned += 1;

      const origemTexto = buildObservationText(doc);
      if (!origemTexto) continue;

      const pedidos = extractPedidosFromText(origemTexto);
      if (!pedidos.length) continue;

      for (const pedido of pedidos) {
        const ins = await pool.query(
          `
          INSERT INTO public.erp_compra_queue (
            nfe_id,
            chave_nfe,
            pedido,
            origem_texto,
            status_integracao
          )
          VALUES ($1, $2, $3, $4, 'PENDENTE')
          ON CONFLICT (nfe_id, pedido) DO NOTHING
          RETURNING id, pedido
          `,
          [doc.id, doc.chave_nfe, pedido, origemTexto]
        );

        if (ins.rowCount > 0) {
          inserted += 1;
          details.push({
            nfe_id: doc.id,
            chave_nfe: doc.chave_nfe,
            pedido,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      scanned,
      inserted,
      details,
    });
  } catch (e) {
    console.error("Erro em /api/erp/compras/queue-from-nfe:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao popular fila de pedidos a partir da NF-e",
      details: e?.message || String(e),
    });
  }
}