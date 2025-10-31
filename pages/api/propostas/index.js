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
    if (!empresa_id) {
      return res.status(400).json({ error: "Usuário não possui empresa vinculada." });
    }

    if (req.method === "GET") {
      const limit = parseInt(req.query.limit, 10) || 10;

      const propostasRes = await client.query(
        `SELECT p.*, c.nome as cliente_nome
         FROM propostas p
         JOIN clientes c ON p.cliente_id = c.id
         WHERE p.empresa_id = $1
         ORDER BY p.created_at DESC
         LIMIT $2`,
        [empresa_id, limit]
      );

      const propostas = propostasRes.rows;

      for (const p of propostas) {
        const servicosRes = await client.query(
          `SELECT
             descricao,
             horas,
             valor_hora,
             total,
             observacao_servico,
             observacao AS observacao_legacy,
             COALESCE(observacao_servico, observacao) AS observacao
           FROM proposta_servicos
           WHERE proposta_id = $1
           ORDER BY id ASC`,
          [p.id]
        );
        p.servicos = servicosRes.rows;
      }

      return res.status(200).json(propostas);
    }

    if (req.method === "POST") {
      const { cliente_id, servicos, validade, observacao, total } = req.body;

      if (!cliente_id || !Array.isArray(servicos) || servicos.length === 0 || !validade) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes ou inválidos" });
      }

      await client.query("BEGIN");

      const resumoServico = servicos.map((s) => s.descricao).join(", ");

      const insertPropostaQuery = `
        INSERT INTO propostas (empresa_id, cliente_id, validade, observacao, valor, servico)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const propostaRes = await client.query(insertPropostaQuery, [
        empresa_id,
        cliente_id,
        validade,
        observacao || null,
        total,
        resumoServico,
      ]);
      const propostaId = propostaRes.rows[0].id;

      const insertServicoQuery = `
        INSERT INTO proposta_servicos (
          proposta_id,
          descricao,
          horas,
          valor_hora,
          total,
          observacao_servico,
          observacao
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      for (const s of servicos) {
        if (!s?.descricao || s.horas == null || s.valorHora == null || s.total == null) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Serviços com campos inválidos" });
        }
        const observacaoServico =
          typeof s.observacao === "string" && s.observacao.trim() !== ""
            ? s.observacao.trim()
            : null;
        await client.query(insertServicoQuery, [
          propostaId,
          s.descricao,
          s.horas,
          s.valorHora,
          s.total,
          observacaoServico,
          observacaoServico,
        ]);
      }

      await client.query("COMMIT");

      return res.status(201).json({ message: "Proposta criada com sucesso", propostaId });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Erro ao realizar rollback:", rollbackErr);
    }
    console.error("Erro API propostas:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  } finally {
    client.release();
  }
}