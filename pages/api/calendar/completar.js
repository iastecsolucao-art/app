// pages/api/calendar/completar.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    const { id, cliente_id, servico, profissional_id, valor, obs } = req.body;

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return res.status(400).json({ error: "ID inválido do agendamento" });
    }

    await client.query(
      `UPDATE agendamentos
       SET cliente_id=$1, servico=$2, profissional_id=$3, valor=$4, obs=$5
       WHERE id=$6`,
      [
        cliente_id ? Number(cliente_id) : null,
        servico || null,
        profissional_id ? Number(profissional_id) : null,
        valor ? Number(valor) : null,
        obs || null,
        numericId,
      ]
    );

    return res.status(200).json({ message: "✅ Informações atualizadas com sucesso!" });
  } catch (err) {
    console.error("Erro ao completar agendamento:", err);
    return res.status(500).json({ error: "Erro interno ao salvar agendamento" });
  } finally {
    client.release();
  }
}