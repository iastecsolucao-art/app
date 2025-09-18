// pages/api/dashboard.js
import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
//import { authOptions } from "./auth/[...nextauth]";
import { authOptions } from "../auth/[...nextauth]";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    const userRes = await client.query(
      "SELECT empresa_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }
    const { empresa_id } = userRes.rows[0];

    // 🔹 Totais de faturas
    const faturasResumo = await client.query(
      `SELECT 
        SUM(CASE WHEN status='Aberto' THEN total ELSE 0 END) as total_aberto,
        SUM(CASE WHEN status='Pago' THEN total ELSE 0 END) as total_pago,
        SUM(total) as total_geral
       FROM faturas WHERE empresa_id=$1`,
      [empresa_id]
    );

    // 🔹 Agendamentos
    const agResumo = await client.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status='agendado') as pendentes,
        COUNT(*) FILTER (WHERE status='faturado') as faturados,
        COUNT(*) FILTER (WHERE status='cancelado') as cancelados
       FROM agendamentos WHERE empresa_id=$1`,
      [empresa_id]
    );

    // 🔹 Faturamento por mês
    const faturamentoMensal = await client.query(
      `SELECT TO_CHAR(data, 'YYYY-MM') as mes, SUM(total) as total
       FROM faturas WHERE empresa_id=$1 AND status='Pago'
       GROUP BY mes ORDER BY mes DESC LIMIT 6`,
      [empresa_id]
    );

    // 🔹 Formas de pagamento
    const formasPagamento = await client.query(
      `SELECT forma_pagamento, COUNT(*) as qtd, SUM(total) as total
       FROM faturas WHERE empresa_id=$1 AND status='Pago'
       GROUP BY forma_pagamento`,
      [empresa_id]
    );

// dentro do handler, após formasPagamento
const faturamentoDiario = await client.query(
  `SELECT TO_CHAR(data, 'YYYY-MM-DD') as dia, SUM(total) as total
   FROM faturas 
   WHERE empresa_id=$1 AND status='Pago' 
     AND data >= NOW() - interval '30 days'
   GROUP BY dia ORDER BY dia`,
  [empresa_id]
);

return res.json({
  faturas: faturasResumo.rows[0],
  agendamentos: agResumo.rows[0],
  mensal: faturamentoMensal.rows,
  pagamentos: formasPagamento.rows,
  diario: faturamentoDiario.rows
});

    
    return res.json({
      faturas: faturasResumo.rows[0],
      agendamentos: agResumo.rows[0],
      mensal: faturamentoMensal.rows,
      pagamentos: formasPagamento.rows
    });
  } catch (err) {
    console.error("Erro API dashboard:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  } finally {
    client.release();
  }
}