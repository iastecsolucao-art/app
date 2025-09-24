import { getSession } from "next-auth/react";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // Obtém a sessão do usuário a partir do request
  const session = await getSession({ req });

  if (!session) {
    // Usuário não autenticado
    return res.status(401).json({ error: "Não autorizado" });
  }

  // Pega o empresa_id da sessão
  const empresa_id = session.user?.empresa_id;

  if (!empresa_id) {
    return res.status(401).json({ error: "Empresa não encontrada na sessão" });
  }

  const {
    profissional_id,
    dia_semana,
    abertura,
    inicio_almoco,
    fim_almoco,
    intervalo_inicio,
    intervalo_fim,
    fechamento,
  } = req.body;

  // Validação básica dos campos obrigatórios
  if (!profissional_id || !dia_semana || !abertura || !fechamento) {
    return res.status(400).json({ error: "Campos obrigatórios faltando" });
  }

  try {
    await pool.query(
      `INSERT INTO horarios_estabelecimento 
      (empresa_id, profissional_id, dia_semana, abertura, inicio_almoco, fim_almoco, intervalo_inicio, intervalo_fim, fechamento)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [empresa_id, profissional_id, dia_semana, abertura, inicio_almoco, fim_almoco, intervalo_inicio, intervalo_fim, fechamento]
    );

    return res.status(200).json({ message: "Horário cadastrado com sucesso" });
  } catch (error) {
    console.error("Erro ao salvar horário:", error);
    return res.status(500).json({ error: "Erro ao salvar horário" });
  }
}