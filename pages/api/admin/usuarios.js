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
        "SELECT id, nome, email, empresa, role, expiracao, created_at FROM usuarios WHERE empresa_id = $1 ORDER BY nome",
        [session.user.empresa_id]
      );
      return res.json(result.rows);
    }

    if (req.method === "POST") {
      const { nome, email, empresa, role } = req.body;
      const empresa_id = session.user.empresa_id;

      // Pegar Plano e Máximo de Usuários
      const planRes = await client.query(`
        SELECT p.max_usuarios 
        FROM saas_planos p 
        INNER JOIN empresa e ON e.plano = p.nome 
        WHERE e.id = $1
      `, [empresa_id]);

      const maxUsuarios = planRes.rows.length > 0 ? planRes.rows[0].max_usuarios : 2;

      // Contar usuários atuais
      const countRes = await client.query(`SELECT COUNT(id) as total FROM usuarios WHERE empresa_id = $1`, [empresa_id]);
      const qtyAtuais = parseInt(countRes.rows[0].total);

      if (qtyAtuais >= maxUsuarios) {
        return res.status(403).json({ error: `O limite de usuários do seu plano SaaS (${maxUsuarios}) foi atingido.` });
      }

      const insert = await client.query(
        `INSERT INTO usuarios (nome, email, empresa, role, empresa_id) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [nome, email, empresa, role || "user", empresa_id]
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