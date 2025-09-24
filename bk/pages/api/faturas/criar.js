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
    const { cliente_id, agendamento_id, itens } = req.body;

    if (!agendamento_id) {
      return res.status(400).json({ error: "Agendamento é obrigatório" });
    }
    if (!cliente_id) {
      return res.status(400).json({ error: "Cliente é obrigatório" });
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "Itens da fatura são obrigatórios" });
    }

    // Busca empresa_id do usuário logado
    const userRes = await client.query(
      "SELECT empresa_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não encontrado" });
    }
    const { empresa_id } = userRes.rows[0];

    // Calcula total
    const total = itens.reduce((acc, item) => acc + (item.valor * item.quantidade), 0);

    // Cria fatura
    const fatRes = await client.query(
      `INSERT INTO faturas (empresa_id, cliente_id, agendamento_id, total, status, data)
       VALUES ($1, $2, $3, $4, 'Aberto', CURRENT_DATE)
       RETURNING *`,
      [empresa_id, cliente_id, agendamento_id, total]
    );

    const fatura_id = fatRes.rows[0].id;

    // Insere itens na fatura_itens
    for (const item of itens) {
      if (item.tipo === "servico") {
        await client.query(
          `INSERT INTO fatura_itens (fatura_id, servico_id, quantidade, valor)
           VALUES ($1, $2, $3, $4)`,
          [fatura_id, item.item_id, item.quantidade, item.valor]
        );
      } else if (item.tipo === "produto") {
        await client.query(
          `INSERT INTO fatura_itens (fatura_id, produto_id, quantidade, valor)
           VALUES ($1, $2, $3, $4)`,
          [fatura_id, item.item_id, item.quantidade, item.valor]
        );
      } else {
        console.warn(`Item com tipo inválido: ${item.tipo}`);
      }
    }

    // Atualiza status do agendamento
    await client.query(
      `UPDATE agendamentos SET status='faturado' WHERE id=$1 AND empresa_id=$2`,
      [agendamento_id, empresa_id]
    );

    return res.status(200).json({ message: "✅ Fatura gerada com sucesso!", fatura: fatRes.rows[0] });
  } catch (err) {
    console.error("Erro ao gerar fatura:", err);
    return res.status(500).json({ error: "Erro interno ao gerar fatura" });
  } finally {
    client.release();
  }
}