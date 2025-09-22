import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const { method } = req;
  const { id } = req.query;

  const empresa_id = req.headers["x-empresa-id"];
  if (!empresa_id) {
    return res.status(401).json({ error: "Empresa não informada" });
  }

  const client = await pool.connect();

  try {
    if (method === "PUT") {
      const { codigo_barra, descricao } = req.body;
      if (!codigo_barra || !descricao) {
        return res.status(400).json({ error: "Campos obrigatórios faltando" });
      }

      const update = await client.query(
        `UPDATE produto SET codigo_barra = $1, descricao = $2
         WHERE id = $3 AND empresa_id = $4 RETURNING *`,
        [codigo_barra, descricao, id, empresa_id]
      );

      if (update.rowCount === 0) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      return res.status(200).json(update.rows[0]);
    }

    if (method === "DELETE") {
      const del = await client.query(
        "DELETE FROM produto WHERE id = $1 AND empresa_id = $2",
        [id, empresa_id]
      );

      if (del.rowCount === 0) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      return res.status(204).end();
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro no servidor" });
  } finally {
    client.release();
  }
}