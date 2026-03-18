import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

let pool = global._erpPgPool;

if (!pool) {
  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  global._erpPgPool = pool;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  try {
    const { queue_id, pedido, status, message } = req.body;

    if (!queue_id && !pedido) {
      return res.status(400).json({
        error: "queue_id ou pedido é obrigatório",
      });
    }

    const result = await pool.query(
      `
      UPDATE public.compras_stage
      SET
        status_stage = $1,
        mensagem_status = $2,
        updated_at = NOW()
      WHERE queue_id = $3 OR pedido_origem = $4
      RETURNING *
      `,
      [
        String(status).toUpperCase(),
        message,
        queue_id,
        pedido,
      ]
    );

    return res.status(200).json({
      success: true,
      rows: result.rows,
    });

  } catch (e) {
    console.error("Erro stage-status:", e);

    return res.status(500).json({
      error: e.message,
    });
  }
}