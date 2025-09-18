import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const { id } = req.query;
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

    if (req.method === "PUT") {
      const { nome, especialidade } = req.body;
      const result = await client.query(
        "UPDATE profissionais SET nome=$1, especialidade=$2 WHERE id=$3 AND empresa_id=$4 RETURNING *",
        [nome, especialidade, id, empresa_id]
      );
      return res.json(result.rows[0]);
    }

    if (req.method === "DELETE") {
      await client.query("DELETE FROM profissionais WHERE id=$1 AND empresa_id=$2", [id, empresa_id]);
      return res.json({ message: "Profissional removido" });
    }

    return res.status(405).end();
  } finally {
    client.release();
  }
}