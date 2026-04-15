import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  const client = await pool.connect();
  
  try {
    const adminCheck = await client.query('SELECT admin FROM usuarios WHERE email = $1', [session.user.email]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].admin !== true) {
       client.release();
       return res.status(403).json({ error: "Acesso restrito a Super Admins." });
    }

    if (req.method === "GET") {
      const result = await client.query("SELECT * FROM saas_modulos ORDER BY id ASC");
      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const { nome } = req.body;
      const lowered = String(nome).toLowerCase().trim().replace(/\s+/g, '_');
      
      const ins = await client.query(`
        INSERT INTO saas_modulos (nome)
        VALUES ($1) RETURNING *
      `, [lowered]);
      return res.status(200).json(ins.rows[0]);
    }

    res.status(405).end();
  } catch (err) {
    console.error("Erro Modulos:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
}
