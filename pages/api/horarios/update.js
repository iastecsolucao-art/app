import { getSession } from "next-auth/react";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const empresa_id = session.user?.empresa_id;
  if (!empresa_id) {
    return res.status(401).json({ error: "Empresa não encontrada na sessão" });
  }

  const {
    id,
    profissional_id,
    dias_semana, // string CSV, ex: "Segunda-feira, Quarta-feira"
    abertura,
    inicio_almoco,
    fim_almoco,
    intervalo_inicio,
    intervalo_fim,
    fechamento,
  } = req.body;

  if (!id || !profissional_id || !dias_semana || !abertura || !fechamento) {
    return res.status(400).json({ error: "Campos obrigatórios faltando" });
  }

  try {
    // Atualiza o registro pelo id e empresa_id para segurança
    const result = await pool.query(
      `UPDATE horarios_estabelecimento SET
        profissional_id = $1,
        dia_semana = $2,
        abertura = $3,
        inicio_almoco = $4,
        fim_almoco = $5,
        intervalo_inicio = $6,
        intervalo_fim = $7,
        fechamento = $8
      WHERE id = $9 AND empresa_id = $10`,
      [profissional_id, dias_semana, abertura, inicio_almoco, fim_almoco, intervalo_inicio, intervalo_fim, fechamento, id, empresa_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Horário não encontrado ou não pertence à empresa" });
    }

    return res.status(200).json({ message: "Horário atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar horário:", error);
    return res.status(500).json({ error: "Erro ao atualizar horário" });
  }
}