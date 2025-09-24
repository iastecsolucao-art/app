// pages/api/agendamentos/pendentes.js
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
    if (userRes.rows.length === 0) return res.status(400).json({ error: "Usuário inválido" });

    const { empresa_id } = userRes.rows[0];

    const agRes = await client.query(
      `SELECT a.id, a.titulo, a.data_inicio, c.nome as cliente, c.id as cliente_id
       FROM agendamentos a
       JOIN clientes c ON a.cliente_id = c.id
       WHERE a.empresa_id=$1 AND (a.status IS NULL OR a.status='agendado')
       ORDER BY a.data_inicio ASC`,
      [empresa_id]
    );

    return res.json(agRes.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}