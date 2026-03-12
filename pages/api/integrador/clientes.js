import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._integradorListaPgPool;

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

  global._integradorListaPgPool = pool;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(`
      WITH ultimos AS (
        SELECT DISTINCT ON (cliente_codigo)
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
        ORDER BY cliente_codigo, created_at DESC
      )
      SELECT
        cliente_codigo,
        versao_integrador,
        hostname,
        ip_local,
        status,
        mensagem,
        nfe_processadas,
        compras_processadas,
        tempo_ciclo_ms,
        created_at AS ultimo_heartbeat,
        CASE
          WHEN created_at >= NOW() - INTERVAL '2 minutes' THEN 'ONLINE'
          WHEN created_at >= NOW() - INTERVAL '10 minutes' THEN 'ATENCAO'
          ELSE 'OFFLINE'
        END AS status_painel
      FROM ultimos
      ORDER BY cliente_codigo
    `);

    return res.status(200).json({
      rows: result.rows,
    });
  } catch (e) {
    console.error("Erro em /api/integrador/clientes:", {
      message: e?.message,
      stack: e?.stack,
    });

    return res.status(500).json({
      error: "Erro ao listar clientes do integrador",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}