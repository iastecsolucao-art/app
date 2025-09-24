// pages/api/dashboard_servico/index.js
import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    // Pega empresa do usuário logado
    const userRes = await client.query(
      "SELECT empresa_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }
    const { empresa_id } = userRes.rows[0];
    console.log("empresa_id ativo:", empresa_id);

    // Resumo de faturas
    const faturasResumo = await client.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN LOWER(status)='pago' THEN total ELSE 0 END), 0) as total_pago,
        COALESCE(SUM(CASE WHEN LOWER(status)='aberto' THEN total ELSE 0 END), 0) as total_aberto,
        COALESCE(SUM(total), 0) as total_geral
       FROM faturas
       WHERE empresa_id=$1`,
      [empresa_id]
    );

    // Resumo de agendamentos
    const agResumo = await client.query(
      `SELECT
        COALESCE(SUM(CASE WHEN LOWER(status)='agendado' THEN 1 ELSE 0 END),0) as pendentes,
        COALESCE(SUM(CASE WHEN LOWER(status)='faturado' THEN 1 ELSE 0 END),0) as faturados,
        COALESCE(SUM(CASE WHEN LOWER(status)='cancelado' THEN 1 ELSE 0 END),0) as cancelados
       FROM agendamentos
       WHERE empresa_id=$1`,
      [empresa_id]
    );

    // Faturamento mensal
    const faturamentoMensal = await client.query(
      `SELECT TO_CHAR(data, 'YYYY-MM') as mes, SUM(total) as total
       FROM faturas
       WHERE empresa_id=$1
       GROUP BY mes
       ORDER BY mes`,
      [empresa_id]
    );

    // Formas de pagamento
    const formasPagamento = await client.query(
      `SELECT forma_pagamento, SUM(total) as total
       FROM faturas
       WHERE empresa_id=$1 AND LOWER(status)='pago'
       GROUP BY forma_pagamento`,
      [empresa_id]
    );

    // Faturamento diário últimos 30 dias
    const faturamentoDiario = await client.query(
      `SELECT TO_CHAR(data, 'YYYY-MM-DD') as dia, SUM(total) as total
       FROM faturas
       WHERE empresa_id=$1 
         AND LOWER(status)='pago'
         AND data >= NOW() - interval '30 days'
       GROUP BY dia
       ORDER BY dia`,
      [empresa_id]
    );

    return res.json({
      faturas: faturasResumo.rows[0],
      agendamentos: agResumo.rows[0],
      mensal: faturamentoMensal.rows,
      pagamentos: formasPagamento.rows,
      diario: faturamentoDiario.rows,
    });
  } catch (err) {
    console.error("Erro no dashboard_servico:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  } finally {
    client.release();
  }
}