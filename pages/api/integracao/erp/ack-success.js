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
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
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

function extractPedidos(texto) {
  const s = String(texto || "");
  const patterns = [
    /PEDIDO\s+DE\s+COMPRA\s+(\d+)/gi,
    /PEDIDO\(S\)\s*:\s*(\d+)/gi,
    /PEDIDO\s+IB\s*:\s*(\d+)/gi,
    /PEDIDO\s*:\s*(\d+)/gi,
  ];

  const found = new Set();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(s)) !== null) {
      if (match?.[1]) {
        found.add(match[1].trim());
      }
    }
  }

  return Array.from(found);
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
    const { nfe_id, mensagem, protocolo_cliente } = req.body || {};
    const nfeId = Number(nfe_id);

    if (!Number.isInteger(nfeId) || nfeId <= 0) {
      return res.status(400).json({ error: "nfe_id inválido" });
    }

    const msg = mensagem || "Integração concluída com sucesso";

    await client.query("BEGIN");

    const queueRes = await client.query(
      `
      UPDATE public.nfe_erp_queue
      SET
        status = 'INTEGRADO',
        integrado_em = NOW(),
        updated_at = NOW(),
        last_error = NULL,
        reservado_em = NULL,
        reservado_por = NULL
      WHERE nfe_id = $1
      RETURNING id
      `,
      [nfeId]
    );

    await client.query(
      `
      UPDATE public.nfe_document
      SET status_erp = 3
      WHERE id = $1
      `,
      [nfeId]
    );

    const docRes = await client.query(
      `
      SELECT id, infcpl
      FROM public.nfe_document
      WHERE id = $1
      LIMIT 1
      `,
      [nfeId]
    );

    const infcpl = docRes.rows?.[0]?.infcpl || "";
    const pedidos = extractPedidos(infcpl);

    let comprasCriadas = 0;

    for (const pedido of pedidos) {
      const insertRes = await client.query(
        `
        INSERT INTO public.erp_compra_queue (
          nfe_id,
          pedido,
          origem_texto,
          status_integracao,
          mensagem_integracao,
          tentativas,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          'PENDENTE',
          'Criado automaticamente a partir da NF-e integrada',
          0,
          NOW(),
          NOW()
        )
        ON CONFLICT (nfe_id, pedido)
        DO NOTHING
        RETURNING id
        `,
        [nfeId, pedido, infcpl]
      );

      if (insertRes.rowCount > 0) {
        comprasCriadas += 1;
      }
    }

    await client
      .query(
        `
        INSERT INTO public.nfe_erp_log (
          nfe_id,
          tipo_evento,
          mensagem,
          detalhes,
          created_at
        )
        VALUES (
          $1,
          'SUCESSO',
          $2,
          $3,
          NOW()
        )
        `,
        [nfeId, msg, protocolo_cliente || null]
      )
      .catch(() => null);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      nfe_id: nfeId,
      status: "INTEGRADO",
      status_erp: 3,
      queue_updated: queueRes.rowCount > 0,
      pedidos_encontrados: pedidos,
      compras_criadas: comprasCriadas,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Erro em POST /api/integracao/erp/ack-success:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao confirmar sucesso da integração ERP",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}