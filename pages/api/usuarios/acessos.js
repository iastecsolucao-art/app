// pages/api/usuarios/acessos.js
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
      "SELECT id FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    const usuario_id = usuario.rows[0].id;

    // tenta buscar acessos
    const acessos = await client.query(
      "SELECT dashboard, inventario, produtos, compras, comercial, servicos, buckman FROM acessos_usuario WHERE usuario_id=$1",
      [usuario_id]
    );

    let data;
    if (acessos.rows.length === 0) {
      // se não existe, cria automaticamente padrão "tudo liberado"
      const insert = await client.query(
        `INSERT INTO acessos_usuario (usuario_id) 
         VALUES ($1) 
         RETURNING dashboard, inventario, produtos, compras, comercial, servicos`,
        [usuario_id]
      );
      data = insert.rows[0];
    } else {
      data = acessos.rows[0];
    }

    res.json(data);
  } catch (e) {
    console.error("Erro ao buscar acessos:", e);
    res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}