// pages/api/usuarios/listar.js
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
      "SELECT id, empresa_id, role FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (usuario.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });

    const { empresa_id, role } = usuario.rows[0];

    let result;

    if (role === "admin") {
      // 🔥 Admin → pega todos usuários
      result = await client.query(
        `SELECT u.id, u.nome, u.email, u.role, u.empresa_id, 
                a.dashboard, a.inventario, a.produtos, a.compras, a.comercial, a.servicos
         FROM usuarios u
         LEFT JOIN acessos_usuario a ON a.usuario_id = u.id
         ORDER BY u.nome`
      );
    } else {
      // Usuário comum → só da mesma empresa
      result = await client.query(
        `SELECT u.id, u.nome, u.email, u.role,
                a.dashboard, a.inventario, a.produtos, a.compras, a.comercial, a.servicos
         FROM usuarios u
         LEFT JOIN acessos_usuario a ON a.usuario_id = u.id
         WHERE u.empresa_id = $1
         ORDER BY u.nome`,
        [empresa_id]
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao listar usuários:", err);
    res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}