import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const {
    cliente_codigo,
    versao_integrador,
    hostname,
    ip_local,
    status,
    mensagem,
    nfe_processadas,
    compras_processadas,
    tempo_ciclo_ms
  } = req.body || {};

  try {

    await pool.query(
      `
      INSERT INTO public.integrador_heartbeat (
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
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()
      )
      `,
      [
        cliente_codigo,
        versao_integrador,
        hostname,
        ip_local,
        status,
        mensagem,
        nfe_processadas || 0,
        compras_processadas || 0,
        tempo_ciclo_ms || 0
      ]
    );

    return res.status(200).json({
      success: true
    });

  } catch (e) {

    console.error("Erro heartbeat:", e);

    return res.status(500).json({
      error: "Erro ao gravar heartbeat"
    });
  }
}