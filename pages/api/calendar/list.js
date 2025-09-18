// pages/api/calendar/list.js
import { google } from "googleapis";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Não autenticado" });

  const client = await pool.connect();
  try {
    // consulta calendar_id do usuário + empresa
    const usuarioRes = await client.query(
      "SELECT id, empresa_id, google_calendar_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );

    if (usuarioRes.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const { empresa_id, google_calendar_id } = usuarioRes.rows[0];

    // 1) 🔹 Buscar eventos do banco (agendamentos)
    const agRes = await client.query(
      `SELECT id, titulo, data_inicio, data_fim 
       FROM agendamentos 
       WHERE empresa_id=$1 AND data_inicio >= NOW()
       ORDER BY data_inicio ASC
       LIMIT 100`,
      [empresa_id]
    );

    const dbEvents = agRes.rows.map((a) => ({
      id: `db-${a.id}`,
      title: a.titulo,
      start: a.data_inicio,
      end: a.data_fim,
      source: "db",
    }));

    // 2) 🔹 Buscar eventos do Google Calendar (se houver ID configurado)
    let googleEvents = [];
    if (google_calendar_id) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          },
          scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        });

        const calendar = google.calendar({ version: "v3", auth });

        const result = await calendar.events.list({
          calendarId: google_calendar_id,
          timeMin: new Date().toISOString(),
          maxResults: 50,
          singleEvents: true,
          orderBy: "startTime",
        });

        googleEvents = result.data.items.map((event) => ({
          id: `gcal-${event.id}`,
          title: event.summary || "(Sem título)",
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.start.date, // fallback: allDay
          source: "google",
        }));
      } catch (err) {
        console.error("⚠️ Erro ao buscar no Google Calendar:", err.message);
      }
    }

    // 3) 🔹 Combinar banco + google
    const allEvents = [...dbEvents, ...googleEvents];

    return res.json(allEvents);
  } catch (err) {
    console.error("Erro ao listar eventos:", err);
    return res.status(500).json({ error: "Erro interno ao buscar eventos" });
  } finally {
    client.release();
  }
}