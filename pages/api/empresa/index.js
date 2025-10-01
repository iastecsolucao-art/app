import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    const userRes = await client.query(
      "SELECT empresa_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const { empresa_id } = userRes.rows[0];
    if (!empresa_id) {
      return res.status(400).json({ error: "Usuário não possui empresa vinculada." });
    }

    const empresaRes = await client.query(
      "SELECT * FROM empresa WHERE id=$1",
      [empresa_id]
    );

    if (empresaRes.rows.length === 0) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    return res.json(empresaRes.rows[0]);
  } catch (err) {
    console.error("Erro API empresa:", err);
    return res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}