// pages/api/faturas/criar.js
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
    const { agendamento_id } = req.body;
    if (!agendamento_id) {
      return res.status(400).json({ error: "Agendamento é obrigatório" });
    }

    // busca agendamento para calcular fatura
    const agRes = await client.query(
      `SELECT a.id, a.servico, a.valor, a.data_inicio, c.nome as cliente_nome
         FROM agendamentos a
    LEFT JOIN clientes c ON a.cliente_id = c.id
        WHERE a.id=$1`, [agendamento_id]
    );

    if (agRes.rows.length === 0) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const ag = agRes.rows[0];

    // cria fatura
    const fatRes = await client.query(
      `INSERT INTO faturas (agendamento_id, cliente_nome, data, total, status, pagamento)
       VALUES ($1,$2,$3,$4,'Aberto','-')
       RETURNING *`,
      [ag.id, ag.cliente_nome, ag.data_inicio, ag.valor || 0]
    );

    return res.status(200).json({ message: "✅ Fatura gerada com sucesso!", fatura: fatRes.rows[0] });
  } catch (err) {
    console.error("Erro ao gerar fatura:", err);
    return res.status(500).json({ error: "Erro interno ao gerar fatura" });
  } finally {
    client.release();
  }
}