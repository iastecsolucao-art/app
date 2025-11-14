// pages/api/clientes/index.js
import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect(); // 🔑 só aqui inicializa o client
  try {
    // pega empresa_id do usuário logado
    const userRes = await client.query(
      "SELECT empresa_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }

    const { empresa_id } = userRes.rows[0];
    if (!empresa_id) {
      return res.status(400).json({ 
        error: "Usuário não possui empresa vinculada. Contate o administrador."
      });
    }

    if (req.method === "GET") {
      const { rows } = await client.query(
        "SELECT * FROM clientes WHERE empresa_id=$1 ORDER BY nome",
        [empresa_id]
      );
      return res.json(rows);
    }

    if (req.method === "POST") {
      const { nome, telefone, email, observacao } = req.body;
      if (!nome || !telefone) {
        return res.status(400).json({ error: "Nome e telefone são obrigatórios" });
      }

      const result = await client.query(
        `INSERT INTO clientes (empresa_id, nome, telefone, email, observacao) 
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [empresa_id, nome, telefone, email, observacao]
      );
      return res.json(result.rows[0]);
    }

    if (req.method === "PUT") {
      const { id, nome, telefone, email, observacao } = req.body;
      const result = await client.query(
        `UPDATE clientes 
         SET nome=$1, telefone=$2, email=$3, observacao=$4
         WHERE id=$5 AND empresa_id=$6 RETURNING *`,
        [nome, telefone, email, observacao, id, empresa_id]
      );
      return res.json(result.rows[0]);
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      await client.query(
        "DELETE FROM clientes WHERE id=$1 AND empresa_id=$2",
        [id, empresa_id]
      );
      return res.json({ message: "Cliente excluído" });
    }

    return res.status(405).json({ error: "Método não suportado" });
  } catch (err) {
    console.error("Erro API clientes:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  } finally {
    client.release();
  }
}