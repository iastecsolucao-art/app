import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    // Validar super admin
    const adminCheck = await client.query(
      "SELECT admin FROM usuarios WHERE email=$1", [session.user.email]
    );
    if (!adminCheck.rows[0]?.admin) return res.status(403).json({ error: "Acesso restrito." });

    if (req.method === "GET") {
      const r = await client.query("SELECT valor FROM saas_config WHERE chave='home_shortcuts_default'");
      return res.json({ shortcuts: r.rows[0]?.valor ?? ["renovar","pedidos","dashboard","produtos"] });
    }

    if (req.method === "POST") {
      const { shortcuts } = req.body;
      await client.query(`
        INSERT INTO saas_config (chave, valor, updated_at)
        VALUES ('home_shortcuts_default', $1, NOW())
        ON CONFLICT (chave) DO UPDATE SET valor=$1, updated_at=NOW()
      `, [JSON.stringify(shortcuts)]);
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}
