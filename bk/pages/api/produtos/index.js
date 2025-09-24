import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"; // ajuste o caminho conforme sua estrutura

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  // Pega empresa_id da sessão do usuário
  const empresa_id = session.user.empresa_id;
  console.log("empresa_id da sessão:", empresa_id);
  if (!empresa_id) {
    return res.status(401).json({ error: "Empresa não informada" });
  }

  const { method, query } = req;
  const client = await pool.connect();

  try {
    if (method === "GET") {
      const { q } = query;
      let sql = "SELECT * FROM produto WHERE empresa_id = $1";
      const params = [empresa_id];

      if (q) {
        sql += " AND (CAST(id AS TEXT) = $2 OR codigo_barra = $2)";
        params.push(q);
      }

      sql += " ORDER BY id";

      const result = await client.query(sql, params);
      return res.status(200).json(result.rows);
    }

    if (method === "POST") {
      const { codigo_barra, descricao, custo, preco, categoria } = req.body;
      if (!codigo_barra || !descricao) {
        return res.status(400).json({ error: "Campos obrigatórios faltando" });
      }

      const insert = await client.query(
        `INSERT INTO produto (codigo_barra, descricao, custo, preco, categoria, empresa_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          codigo_barra,
          descricao,
          custo !== undefined ? custo : 0,
          preco !== undefined ? preco : 0,
          categoria || null,
          empresa_id,
        ]
      );
      return res.status(201).json(insert.rows[0]);
    }

    if (method === "PUT") {
      const { id, codigo_barra, descricao, custo, preco, categoria } = req.body;
      if (!id || !codigo_barra || !descricao) {
        return res.status(400).json({ error: "Campos obrigatórios faltando" });
      }

      const update = await client.query(
        `UPDATE produto SET codigo_barra = $1, descricao = $2, custo = $3, preco = $4, categoria = $5
         WHERE id = $6 AND empresa_id = $7 RETURNING *`,
        [
          codigo_barra,
          descricao,
          custo !== undefined ? custo : 0,
          preco !== undefined ? preco : 0,
          categoria || null,
          id,
          empresa_id,
        ]
      );

      if (update.rows.length === 0) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      return res.status(200).json(update.rows[0]);
    }

    if (method === "DELETE") {
      const { id } = query;
      if (!id) {
        return res.status(400).json({ error: "ID do produto é obrigatório" });
      }
      const del = await client.query(
        `DELETE FROM produto WHERE id = $1 AND empresa_id = $2 RETURNING *`,
        [id, empresa_id]
      );
      if (del.rows.length === 0) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      return res.status(200).json({ message: "Produto excluído com sucesso" });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro no servidor" });
  } finally {
    client.release();
  }
  console.log("empresa_id da sessão:", empresa_id);
}