import { getSession } from "next-auth/react";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "GET") {
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

  try {
    // Consulta os horários com o nome do profissional (ajuste conforme seu schema)
    const { rows } = await pool.query(
      `SELECT h.id, h.profissional_id, p.nome as profissional_nome, h.dia_semana, h.abertura, h.inicio_almoco, h.fim_almoco, h.intervalo_inicio, h.intervalo_fim, h.fechamento
       FROM horarios_estabelecimento h
       LEFT JOIN profissionais p ON p.id = h.profissional_id
       WHERE h.empresa_id = $1
       ORDER BY p.nome, h.dia_semana`,
      [empresa_id]
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Erro ao listar horários:", error);
    return res.status(500).json({ error: "Erro ao listar horários" });
  }
}