import pool from "../../lib/db";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const { nome, email } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO usuarios (nome, email, role, expiracao)
         VALUES ($1, $2, 'trial', NOW() + interval '1 day')
         ON CONFLICT (email) 
         DO UPDATE SET role='trial', expiracao=NOW() + interval '1 day'
         RETURNING id`,
        [nome, email]
      );

      return res.status(200).json({ success: true, userId: result.rows[0].id });
    } catch (error) {
      console.error("Erro ao criar trial:", error); // 👈 log real
      return res.status(500).json({ error: "Erro ao criar trial", details: error.message });
    }
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}