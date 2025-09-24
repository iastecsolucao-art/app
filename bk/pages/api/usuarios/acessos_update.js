import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Método não suportado" });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const { usuario_id, modulo, valor } = req.body;
  if (!usuario_id || !modulo) return res.status(400).json({ error: "Dados inválidos" });

  const client = await pool.connect();
  try {
    // cria registro se não existir
    await client.query(
      `INSERT INTO acessos_usuario (usuario_id) 
       VALUES ($1) 
       ON CONFLICT (usuario_id) DO NOTHING`,
      [usuario_id]
    );

    // atualiza permissão
    await client.query(
      `UPDATE acessos_usuario 
       SET ${modulo} = $1
       WHERE usuario_id = $2`,
      [valor, usuario_id]
    );

    res.json({ message: "Acesso atualizado!" });
  } catch (err) {
    console.error("Erro ao atualizar acessos:", err);
    res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}