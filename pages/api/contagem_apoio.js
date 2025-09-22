import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const result = await client.query("SELECT * FROM contagem_apoio ORDER BY criado_em DESC LIMIT 100");
      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const { setor, operador, loja } = req.body;
      if (!setor || !operador || !loja) {
        return res.status(400).json({ error: "Campos setor, operador e loja são obrigatórios" });
      }
      const result = await client.query(
        "INSERT INTO contagem_apoio (setor, operador, loja) VALUES ($1, $2, $3) RETURNING *",
        [setor, operador, loja]
      );
      return res.status(201).json(result.rows[0]);
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Método ${req.method} não permitido`);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  } finally {
    client.release();
  }
}