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
    nivel,
    tipo_evento,
    mensagem,
    detalhes
  } = req.body || {};

  try {

    await pool.query(
      `
      INSERT INTO public.integrador_evento (
        cliente_codigo,
        nivel,
        tipo_evento,
        mensagem,
        detalhes,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,NOW()
      )
      `,
      [
        cliente_codigo,
        nivel,
        tipo_evento,
        mensagem,
        detalhes
      ]
    );

    return res.status(200).json({
      success: true
    });

  } catch (e) {

    console.error("Erro evento:", e);

    return res.status(500).json({
      error: "Erro ao gravar evento"
    });
  }
}