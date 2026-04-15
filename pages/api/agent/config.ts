import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    const userRes = await client.query(
      "SELECT empresa_id, role FROM usuarios WHERE email=$1", [session.user.email]
    );
    const { empresa_id, role } = userRes.rows[0] || {};

    if (req.method === "GET") {
      // Busca config da empresa ou config global (empresa_id IS NULL)
      const r = await client.query(
        `SELECT system_prompt, model_name FROM agent_config 
         WHERE empresa_id=$1 OR empresa_id IS NULL 
         ORDER BY empresa_id NULLS LAST LIMIT 1`,
        [empresa_id]
      );
      const { system_prompt, model_name } = r.rows[0] || {};
      return res.json({ 
        system_prompt: system_prompt || "Você é um assistente de gestão empresarial do sistema IasTec. Responda sempre em português, de forma direta e útil.",
        model_name: model_name || "gemini-1.5-flash"
      });
    }

    if (req.method === "POST") {
      if (role !== "admin") return res.status(403).json({ error: "Sem permissão" });
      const { system_prompt, model_name } = req.body;
      // Upsert por empresa
      await client.query(
        `INSERT INTO agent_config (empresa_id, system_prompt, model_name, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (empresa_id) DO UPDATE SET system_prompt=$2, model_name=$3, updated_at=NOW()`,
        [empresa_id, system_prompt, model_name || "gemini-1.5-flash"]
      );
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (e) {
    console.error("agent/config:", e);
    res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}
