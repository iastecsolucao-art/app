import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    if (req.method === "GET") {
      const result = await client.query(
        "SELECT home_shortcuts FROM usuarios WHERE email=$1", [session.user.email]
      );
      let shortcuts = result.rows[0]?.home_shortcuts ?? null;

      // Se o usuário nunca personalizou, usa o padrão global do SuperAdmin
      if (!shortcuts) {
        const globalDefault = await client.query(
          "SELECT valor FROM saas_config WHERE chave='home_shortcuts_default'"
        );
        shortcuts = globalDefault.rows[0]?.valor ?? ["renovar","pedidos","dashboard","produtos"];
      }

      return res.json({ shortcuts });
    }

    if (req.method === "POST") {
      const { shortcuts } = req.body;
      await client.query(
        "UPDATE usuarios SET home_shortcuts=$1 WHERE email=$2",
        [JSON.stringify(shortcuts), session.user.email]
      );
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
