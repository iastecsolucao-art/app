import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { google } from "googleapis";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não suportado" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  const client = await pool.connect();
  try {
    const { cliente, nome, telefone, start, servico, obs, profissional } = req.body;

    if (!cliente || !nome || !telefone || !start || !servico || !profissional) {
      return res.status(400).json({ error: "Campos obrigatórios não enviados" });
    }

    // pega usuário logado (+ google_calendar_id)
    const usuario = await client.query(
      "SELECT id, empresa_id, google_calendar_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { id: usuario_id, empresa_id, google_calendar_id } = usuario.rows[0];

    // monta horários
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + 60 * 60000);

    // título e descrição
    const titulo = `${servico} - ${nome}`;
    const descricao = `Nome: ${nome}\nTelefone: ${telefone}\nServiço: ${servico}\nProfissional: ${profissional}\nObs: ${obs || ""}`;

    // INSERE agendamento no banco (sem google_event_id ainda)
    const result = await client.query(
      `INSERT INTO agendamentos 
        (empresa_id, usuario_id, cliente_id, titulo, descricao, data_inicio, data_fim, servico, profissional_id, telefone, nome, obs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        empresa_id,
        usuario_id,
        cliente,
        titulo,
        descricao,
        startDate,
        endDate,
        servico,
        profissional,
        telefone,
        nome,
        obs,
      ]
    );

    const agendamentoId = result.rows[0].id;

    let googleEventId = null;

    // 🔹 Envia também para o Google Calendar SE estiver configurado
    if (google_calendar_id) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          },
          scopes: ["https://www.googleapis.com/auth/calendar"],
        });

        const calendar = google.calendar({ version: "v3", auth });

        const insertResult = await calendar.events.insert({
          calendarId: google_calendar_id,
          requestBody: {
            summary: titulo,
            description: descricao,
            start: { dateTime: startDate.toISOString(), timeZone: "America/Sao_Paulo" },
            end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
          },
        });

        googleEventId = insertResult.data.id;

        // Atualiza o agendamento no banco com o google_event_id
        if (googleEventId) {
          await client.query(
            "UPDATE agendamentos SET google_event_id = $1 WHERE id = $2",
            [googleEventId, agendamentoId]
          );
        }
      } catch (err) {
        console.error("Erro ao salvar no Google Calendar:", err.message);
      }
    }

    // 🔹 Webhook para n8n (mantendo compatibilidade)
    await fetch("https://n8n.iastec.servicos.ws/webhook/agendamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agendamento_id: agendamentoId,
        cliente_id: cliente,
        nome,
        telefone,
        servico,
        profissional,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        obs,
        google_event_id: googleEventId, // opcional para n8n
      }),
    });

    return res.json({ message: "Agendamento criado com sucesso!", id: agendamentoId, google_event_id: googleEventId });
  } catch (err) {
    console.error("Erro ao reservar:", err);
    return res.status(500).json({ error: "Erro interno ao reservar", details: err.message });
  } finally {
    client.release();
  }
}