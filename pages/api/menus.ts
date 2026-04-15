import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Inválido" });
  }

  const client = await pool.connect();
  try {
    const result = await client.query("SELECT * FROM saas_menu_links ORDER BY modulo, ordem ASC, id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro na busca de menus:", err);
    res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}
