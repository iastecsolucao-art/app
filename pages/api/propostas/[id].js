import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const { id } = req.query;
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
    if (!empresa_id) {
      return res.status(400).json({ error: "Usuário não possui empresa vinculada." });
    }

    if (req.method === "PUT") {
      const { cliente_id, servicos, validade, observacao, total } = req.body;

      if (!cliente_id || !servicos || !Array.isArray(servicos) || servicos.length === 0 || !validade) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes ou inválidos" });
      }

      await client.query("BEGIN");

      // Atualiza proposta principal
      const resumoServico = servicos.map(s => s.descricao).join(", ");

      await client.query(
        `UPDATE propostas SET cliente_id=$1, validade=$2, observacao=$3, valor=$4, servico=$5 WHERE id=$6 AND empresa_id=$7`,
        [cliente_id, validade, observacao || null, total, resumoServico, id, empresa_id]
      );

      // Remove serviços antigos
      await client.query(`DELETE FROM proposta_servicos WHERE proposta_id=$1`, [id]);

      // Insere serviços novos
      const insertServicoQuery = `
        INSERT INTO proposta_servicos (proposta_id, descricao, horas, valor_hora, total)
        VALUES ($1, $2, $3, $4, $5)
      `;

      for (const s of servicos) {
        if (!s.descricao || !s.horas || !s.valorHora || !s.total) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Serviços com campos inválidos" });
        }
        await client.query(insertServicoQuery, [
          id,
          s.descricao,
          s.horas,
          s.valorHora,
          s.total,
        ]);
      }

      await client.query("COMMIT");

      return res.status(200).json({ message: "Proposta atualizada com sucesso" });
    }

    if (req.method === "DELETE") {
      // Deleta proposta e serviços vinculados (cascade)
      const deleteRes = await client.query(
        `DELETE FROM propostas WHERE id=$1 AND empresa_id=$2`,
        [id, empresa_id]
      );

      if (deleteRes.rowCount === 0) {
        return res.status(404).json({ error: "Proposta não encontrada" });
      }

      return res.status(200).json({ message: "Proposta excluída com sucesso" });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro API propostas:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  } finally {
    client.release();
  }
}