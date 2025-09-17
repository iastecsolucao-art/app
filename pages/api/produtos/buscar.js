import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { codigo } = req.query;

    if (!codigo) {
      return res.status(400).json({ error: "Código não informado" });
    }

    try {
      const client = await pool.connect();
      const result = await client.query(
        "SELECT * FROM produto WHERE codigo_barra = $1",
        [codigo]
      );
      client.release();

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      return res.status(200).json(result.rows);
    } catch (err) {
      console.error("Erro no banco:", err);
      return res.status(500).json({ error: "Erro ao buscar produto" });
    }
  } else {
    return res.status(405).json({ error: "Método não permitido" });
  }
}