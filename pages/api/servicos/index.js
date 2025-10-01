import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    const usuario = await client.query(
      "SELECT empresa_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (usuario.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    const { empresa_id } = usuario.rows[0];

    if (req.method === "GET") {
      const result = await client.query("SELECT * FROM servicos WHERE empresa_id=$1 ORDER BY nome", [empresa_id]);
      return res.json(result.rows);
    }

    if (req.method === "POST") {
      const { nome, descricao, duracao_minutos } = req.body;
      const result = await client.query(
        "INSERT INTO servicos (empresa_id, nome, descricao, duracao_minutos) VALUES ($1,$2,$3,$4) RETURNING *",
        [empresa_id, nome, descricao, duracao_minutos || 60]
      );
      return res.json(result.rows[0]);
    }

    return res.status(405).end();
  } finally {
    client.release();
  }
}