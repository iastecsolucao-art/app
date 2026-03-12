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

function extractPedido(texto) {
  const s = String(texto || "");

  const patterns = [
    /PEDIDO\s+DE\s+COMPRA\s+(\d+)/i,
    /PEDIDO\(S\)\s*:\s*(\d+)/i,
    /PEDIDO\s+IB\s*:\s*(\d+)/i,
    /PEDIDO\s*:\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = s.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  const client = await pool.connect();

  try {
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1),
      200
    );

    const result = await client.query(
      `
      SELECT
        q.id AS queue_id,
        q.nfe_id,
        q.status,
        q.tentativas,
        q.last_error,
        q.integrado_em,
        q.reservado_em,
        q.reservado_por,
        q.created_at,
        q.updated_at,
        d.chave_nfe,
        d.n_nf,
        d.serie,
        d.cnpj_emit,
        d.xnome_emit,
        d.cnpj_dest,
        d.xnome_dest,
        d.infcpl
      FROM public.nfe_erp_queue q
      JOIN public.nfe_document d
        ON d.id = q.nfe_id
      WHERE q.status IN ('PENDENTE', 'ERRO')
         OR (
              q.status = 'PROCESSANDO'
              AND q.reservado_em IS NOT NULL
              AND q.reservado_em < NOW() - INTERVAL '1 minute'
            )
      ORDER BY q.updated_at ASC, q.id ASC
      LIMIT $1
      `,
      [limit]
    );

    const rows = (result.rows || [])
      .map((row) => {
        const pedido = extractPedido(row.infcpl);

        return {
          queue_id: row.queue_id,
          nfe_id: row.nfe_id,
          pedido,
          origem_texto: row.infcpl,
          chave_nfe: row.chave_nfe,
          n_nf: row.n_nf,
          serie: row.serie,
          cnpj_emit: row.cnpj_emit,
          xnome_emit: row.xnome_emit,
          cnpj_dest: row.cnpj_dest,
          xnome_dest: row.xnome_dest,
          status_integracao: row.status,
          mensagem_integracao: row.last_error,
          reservado_em: row.reservado_em,
          reservado_por: row.reservado_por,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      })
      .filter((row) => !!row.pedido);

    return res.status(200).json({ rows });
  } catch (e) {
    console.error("Erro em GET /api/erp/compras/pendentes:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao buscar pedidos pendentes",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}