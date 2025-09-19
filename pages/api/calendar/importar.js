// pages/api/calendar/importar.js
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
    const {
      gcal_event_id,
      title,
      start,
      end,
      nome,
      telefone,
      servico,
      profissional_id,
      cliente_id,
      obs
    } = req.body;

    if (!start || !title) {
      return res.status(400).json({ error: "Dados insuficientes" });
    }

    // 🔹 Verifica empresa do usuário
    const usuarioRes = await client.query(
      "SELECT empresa_id, id FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (usuarioRes.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { empresa_id, id: usuario_id } = usuarioRes.rows[0];

    // 🔹 Evita importar duplicado
    const existe = await client.query(
      "SELECT id FROM agendamentos WHERE google_event_id=$1 AND empresa_id=$2",
      [gcal_event_id, empresa_id]
    );
    if (existe.rows.length > 0) {
      return res.status(200).json({ 
        message: "Evento já foi importado anteriormente.",
        agendamento_id: existe.rows[0].id 
      });
    }

    // 🔹 Insere no banco
    const result = await client.query(
      `INSERT INTO agendamentos 
        (empresa_id, usuario_id, titulo, data_inicio, data_fim, 
         cliente_id, servico, profissional_id, nome, telefone, obs, google_event_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'agendado')
       RETURNING id, titulo, data_inicio, data_fim`,
      [
        empresa_id,
        usuario_id,
        title,
        start,
        end || start,
        cliente_id || null,
        servico || null,
        profissional_id || null,
        nome || null,
        telefone || null,
        obs || null,
        gcal_event_id || null
      ]
    );

    return res.status(201).json({
      message: "✅ Evento importado e salvo no sistema!",
      agendamento: result.rows[0],
    });
  } catch (err) {
    console.error("Erro ao importar evento:", err);
    return res.status(500).json({ error: "Erro interno ao importar evento" });
  } finally {
    client.release();
  }
}