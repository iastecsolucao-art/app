// pages/api/admin/usuarios.js
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
      "SELECT role FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (usuario.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });

    if (usuario.rows[0].role !== "admin") {
      return res.status(403).json({ error: "Sem permissão" });
    }

    if (req.method === "GET") {
      const result = await client.query(
        "SELECT id, nome, email, empresa, role, expiracao, created_at FROM usuarios ORDER BY nome"
      );
      return res.json(result.rows);
    }

    if (req.method === "POST") {
      const { nome, email, empresa, role } = req.body;
      const insert = await client.query(
        `INSERT INTO usuarios (nome, email, empresa, role) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [nome, email, empresa, role || "user"]
      );
      return res.json(insert.rows[0]);
    }

    if (req.method === "PUT") {
      const { id, nome, email, empresa, role, expiracao } = req.body;
      const update = await client.query(
        `UPDATE usuarios 
         SET nome=$1, email=$2, empresa=$3, role=$4, expiracao=$5
         WHERE id=$6 RETURNING *`,
        [nome, email, empresa, role, expiracao, id]
      );
      return res.json(update.rows[0]);
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      await client.query("DELETE FROM usuarios WHERE id=$1", [id]);
      return res.json({ message: "Usuário excluído" });
    }

    return res.status(405).json({ error: "Método não suportado" });

  } catch (err) {
    console.error("Erro na API /usuarios:", err);
    res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}