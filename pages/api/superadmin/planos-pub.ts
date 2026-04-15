import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// API pública — sem autenticação — apenas leitura dos planos disponíveis
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT nome, preco, max_usuarios, menus_permitidos, descricao FROM saas_planos ORDER BY preco ASC"
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("planos-pub:", err);
    return res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}
