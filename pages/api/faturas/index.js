// pages/api/faturas/index.js
import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
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

    if (req.method === "GET") {
      const faturasRes = await client.query(
        `SELECT f.*, c.nome as cliente
         FROM faturas f
         JOIN clientes c ON f.cliente_id = c.id
         WHERE f.empresa_id=$1
         ORDER BY f.created_at DESC`,
        [empresa_id]
      );
      return res.json(faturasRes.rows);
    }

    if (req.method === "POST") {
      // criar fatura
      const { cliente_id, agendamento_id, itens } = req.body;
      if (!cliente_id || !itens || itens.length === 0) {
        return res.status(400).json({ error: "Dados insuficientes" });
      }

      await client.query("BEGIN");

      const faturaRes = await client.query(
        `INSERT INTO faturas (empresa_id, cliente_id, agendamento_id, total, status) 
         VALUES ($1,$2,$3,0,'Aberto') RETURNING id`,
        [empresa_id, cliente_id, agendamento_id || null]
      );
      const fatura_id = faturaRes.rows[0].id;

      let total = 0;
      for (let item of itens) {
        const { servico_id, quantidade, valor } = item;
        const subtotal = quantidade * valor;
        total += subtotal;
        await client.query(
          `INSERT INTO fatura_itens (fatura_id, servico_id, quantidade, valor) 
           VALUES ($1,$2,$3,$4)`,
          [fatura_id, servico_id, quantidade, valor]
        );
      }

      await client.query(
        "UPDATE faturas SET total=$1 WHERE id=$2",
        [total, fatura_id]
      );

      await client.query("COMMIT");

      return res.json({ message: "Fatura criada", id: fatura_id });
    }

    if (req.method === "PUT") {
      // registrar pagamento
      const { id, forma_pagamento } = req.body;
      if (!id || !forma_pagamento)
        return res.status(400).json({ error: "Fatura e forma de pagamento obrigatórias" });

      await client.query(
        `UPDATE faturas 
         SET status='Pago', forma_pagamento=$1, data_pagamento=NOW()
         WHERE id=$2 AND empresa_id=$3`,
        [forma_pagamento, id, empresa_id]
      );

      return res.json({ message: "Fatura paga com sucesso" });
    }

    return res.status(405).json({ error: "Método não suportado" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro API faturas:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  } finally {
    client.release();
  }
}