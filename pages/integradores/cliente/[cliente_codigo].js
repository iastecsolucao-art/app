import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._integradorDetalhePgPool;

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

  global._integradorDetalhePgPool = pool;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  const rawCodigo = Array.isArray(req.query.cliente_codigo)
    ? req.query.cliente_codigo[0]
    : req.query.cliente_codigo;

  const clienteCodigo = String(rawCodigo || "").trim();

  if (!clienteCodigo) {
    return res.status(400).json({ error: "cliente_codigo inválido" });
  }

  const client = await pool.connect();

  try {
    const hb = await client.query(
      `
      SELECT
        id,
        cliente_codigo,
        versao_integrador,
        hostname,
        ip_local,
        status,
        mensagem,
        nfe_processadas,
        compras_processadas,
        tempo_ciclo_ms,
        created_at
      FROM public.integrador_heartbeat
      WHERE cliente_codigo = $1
      ORDER BY created_at DESC
      LIMIT 30
      `,
      [clienteCodigo]
    );

    const eventos = await client.query(
      `
      SELECT
        id,
        cliente_codigo,
        nivel,
        tipo_evento,
        mensagem,
        detalhes,
        created_at
      FROM public.integrador_evento
      WHERE cliente_codigo = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [clienteCodigo]
    );

    return res.status(200).json({
      cliente_codigo: clienteCodigo,
      heartbeats: hb.rows,
      eventos: eventos.rows,
    });
  } catch (e) {
    console.error("Erro em /api/integrador/cliente/[cliente_codigo]:", {
      message: e?.message,
      stack: e?.stack,
    });

    return res.status(500).json({
      error: "Erro ao consultar detalhe do cliente",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}