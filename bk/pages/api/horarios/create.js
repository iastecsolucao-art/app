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
    profissional_id,
    dias_semana,
    abertura,
    inicio_almoco,
    fim_almoco,
    intervalo_inicio,
    intervalo_fim,
    fechamento,
  } = req.body;

  if (!profissional_id || !dias_semana || !abertura || !fechamento) {
    return res.status(400).json({ error: "Campos obrigatórios faltando" });
  }

  try {
    await pool.query(
      `INSERT INTO horarios_estabelecimento
      (empresa_id, profissional_id, dia_semana, abertura, inicio_almoco, fim_almoco, intervalo_inicio, intervalo_fim, fechamento)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [empresa_id, profissional_id, dias_semana, abertura, inicio_almoco, fim_almoco, intervalo_inicio, intervalo_fim, fechamento]
    );

    return res.status(201).json({ message: "Horário criado com sucesso" });
  } catch (error) {
    console.error("Erro ao criar horário:", error);
    return res.status(500).json({ error: "Erro ao criar horário" });
  }
}