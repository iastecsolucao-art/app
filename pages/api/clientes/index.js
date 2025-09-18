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
      const result = await client.query(
        "SELECT * FROM clientes WHERE empresa_id=$1 ORDER BY nome",
        [empresa_id]
      );
      return res.json(result.rows);
    }

    if (req.method === "POST") {
      const { nome, telefone, email, observacao } = req.body;
      if (!nome || !telefone) return res.status(400).json({ error: "Nome e telefone são obrigatórios" });

      const result = await client.query(
        "INSERT INTO clientes (empresa_id, nome, telefone, email, observacao) VALUES ($1,$2,$3,$4,$5) RETURNING *",
        [empresa_id, nome, telefone, email, observacao]
      );
      return res.json(result.rows[0]);
    }

    return res.status(405).end();
  } finally {
    client.release();
  }
}