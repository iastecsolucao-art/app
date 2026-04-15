import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: "Inválido" });
  }

  const client = await pool.connect();
  try {
    const adminCheck = await client.query('SELECT admin FROM usuarios WHERE email = $1', [session.user.email]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].admin !== true) {
       client.release();
       return res.status(403).json({ error: "Acesso restrito." });
    }

    if (req.method === "GET") {
      const resp = await client.query("SELECT * FROM saas_planos ORDER BY preco ASC");
      return res.json(resp.rows);
    }

    if (req.method === "POST") {
      const { nome, preco, descricao, menus_permitidos, max_usuarios } = req.body;
      const parsedMenus = Array.isArray(menus_permitidos) ? menus_permitidos : [];
      
      const update = await client.query(`
        UPDATE saas_planos 
        SET preco = $1, descricao = $2, menus_permitidos = $3, max_usuarios = $4 
        WHERE nome = $5
        RETURNING *
      `, [preco, descricao, JSON.stringify(parsedMenus), max_usuarios, nome]);
      
      return res.json(update.rows[0]);
    }

    if (req.method === "PUT") {
      const { nome, preco, descricao, menus_permitidos, max_usuarios } = req.body;
      const parsedMenus = Array.isArray(menus_permitidos) ? menus_permitidos : [];
      
      const insert = await client.query(`
        INSERT INTO saas_planos (nome, preco, descricao, menus_permitidos, max_usuarios)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [nome, preco, descricao, JSON.stringify(parsedMenus), max_usuarios]);
      
      return res.json(insert.rows[0]);
    }

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}
