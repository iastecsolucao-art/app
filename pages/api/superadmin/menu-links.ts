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
      const { modulo } = req.query;
      let query = "SELECT * FROM saas_menu_links";
      let params = [];
      if (modulo) {
         query += " WHERE modulo = $1";
         params.push(modulo);
      }
      query += " ORDER BY modulo ASC, ordem ASC, id ASC";
      
      const result = await client.query(query, params);
      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const { id, label, url, ordem } = req.body;
      const upd = await client.query(`
        UPDATE saas_menu_links SET label=$1, url=$2, ordem=$3 WHERE id=$4 RETURNING *
      `, [label, url, parseInt(ordem)||0, id]);
      return res.status(200).json(upd.rows[0]);
    }

    if (req.method === "PUT") {
      const { modulo, label, url, ordem } = req.body;
      const ins = await client.query(`
        INSERT INTO saas_menu_links (modulo, label, url, ordem)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [modulo, label, url, parseInt(ordem)||0]);
      return res.status(200).json(ins.rows[0]);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      await client.query("DELETE FROM saas_menu_links WHERE id=$1", [id]);
      return res.status(200).json({ ok: true });
    }

    res.status(405).end();
  } catch (err) {
    console.error("Erro Menu Links:", err);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
}
