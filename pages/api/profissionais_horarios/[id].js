import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const { id } = req.query;
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

    if (req.method === "PUT") {
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
        `UPDATE horarios_estabelecimento SET
          profissional_id = $1,
          dia_semana = $2,
          abertura = $3,
          inicio_almoco = $4,
          fim_almoco = $5,
          intervalo_inicio = $6,
          intervalo_fim = $7,
          fechamento = $8
         WHERE id = $9 AND empresa_id = $10
         RETURNING *`,
        [
          profissional_id,
          dia_semana,
          abertura,
          emptyToNull(inicio_almoco),
          emptyToNull(fim_almoco),
          emptyToNull(intervalo_inicio),
          emptyToNull(intervalo_fim),
          fechamento,
          id,
          empresa_id,
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Horário não encontrado ou não pertence à empresa" });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === "DELETE") {
      const result = await client.query(
        "DELETE FROM horarios_estabelecimento WHERE id=$1 AND empresa_id=$2",
        [id, empresa_id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Horário não encontrado ou não pertence à empresa" });
      }

      return res.status(200).json({ message: "Horário removido com sucesso" });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (error) {
    console.error("Erro na API profissionais_horarios:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  } finally {
    client.release();
  }
}