import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    const usuario = await client.query(
      "SELECT empresa_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (usuario.rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
    const { empresa_id } = usuario.rows[0];

    function emptyToNull(value) {
      return value === "" ? null : value;
    }

    if (req.method === "GET") {
      const result = await client.query(
        `SELECT h.id, h.profissional_id, p.nome as profissional_nome, h.dia_semana, h.abertura, h.inicio_almoco, h.fim_almoco, h.intervalo_inicio, h.intervalo_fim, h.fechamento
         FROM horarios_estabelecimento h
         LEFT JOIN profissionais p ON p.id = h.profissional_id
         WHERE h.empresa_id = $1
         ORDER BY p.nome, h.dia_semana`,
        [empresa_id]
      );
      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
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

      if (!profissional_id || !dia_semana || !abertura || !fechamento) {
        return res.status(400).json({ error: "Campos obrigatórios faltando" });
      }

      const result = await client.query(
        `INSERT INTO horarios_estabelecimento
         (empresa_id, profissional_id, dia_semana, abertura, inicio_almoco, fim_almoco, intervalo_inicio, intervalo_fim, fechamento)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          empresa_id,
          profissional_id,
          dia_semana,
          abertura,
          emptyToNull(inicio_almoco),
          emptyToNull(fim_almoco),
          emptyToNull(intervalo_inicio),
          emptyToNull(intervalo_fim),
          fechamento,
        ]
      );

      return res.status(201).json(result.rows[0]);
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error("Erro na API profissionais_horarios:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  } finally {
    client.release();
  }
}