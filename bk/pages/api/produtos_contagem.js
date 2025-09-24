import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Método ${req.method} não permitido`);
    }

    const { codigo_barra } = req.query;
    if (!codigo_barra) {
      return res.status(400).json({ error: "Código de barras é obrigatório" });
    }

    const result = await client.query(
      "SELECT codigo_barra, descricao FROM produto WHERE codigo_barra = $1 LIMIT 1",
      [codigo_barra]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}