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
    // Usuário logado
    const usuarioRes = await client.query(
      "SELECT id, empresa_id, google_calendar_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (usuarioRes.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    const { empresa_id, google_calendar_id } = usuarioRes.rows[0];

    // Buscar eventos do banco com info se já foi faturado
    const agRes = await client.query(
      `SELECT 
          a.id,
          a.titulo,
          a.data_inicio,
          a.data_fim,
          a.servico,
          a.profissional_id,
          a.cliente_id,
          a.obs,
          a.nome AS cliente_nome,
          a.telefone AS cliente_telefone,
          a.google_event_id,
          p.nome AS profissional_nome,
          c.nome AS cliente_nome_ref,
          CASE WHEN f.id IS NOT NULL THEN true ELSE false END AS ja_faturado
       FROM agendamentos a
       LEFT JOIN profissionais p ON a.profissional_id = p.id
       LEFT JOIN clientes c ON a.cliente_id = c.id
       LEFT JOIN faturas f ON f.agendamento_id = a.id
       WHERE a.empresa_id=$1 AND a.data_inicio >= NOW()
       ORDER BY a.data_inicio ASC
       LIMIT 100`,
      [empresa_id]
    );

    const dbEvents = agRes.rows.map((a) => ({
      id: a.id, // id numérico do banco
      calendar_id: `db-${a.id}`, // usado no FullCalendar
      title: a.titulo || `${a.servico || "Serviço"} - ${a.cliente_nome || a.cliente_nome_ref || ""}`,
      start: a.data_inicio,
      end: a.data_fim,
      source: "db",
      importado: true,
      servico: a.servico,
      profissional: a.profissional_nome || a.profissional_id || null,
      nome: a.cliente_nome || a.cliente_nome_ref || null,
      telefone: a.cliente_telefone,
      obs: a.obs,
      gcal_event_id: a.google_event_id,
      // Converte 't'/'f' ou true/false para boolean JS
      ja_faturado: a.ja_faturado === true || a.ja_faturado === 't',
    }));

    // Coletar google_event_id já importados
    const dbGoogleIds = dbEvents.map(ev => ev.gcal_event_id).filter(Boolean);

    // Buscar eventos do Google Calendar
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

        googleEvents = (result.data.items || [])
          .filter(event => !dbGoogleIds.includes(event.id))
          .map((event) => ({
            id: null,
            calendar_id: `gcal-${event.id}`,
            gcal_event_id: event.id,
            title: event.summary || "(Sem título)",
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.start.date,
            source: "google",
            importado: false,
            descricao: event.description || "",
            organizador: event.organizer?.displayName || event.organizer?.email || "",
            ja_faturado: false, // eventos do Google não têm fatura no banco
          }));
      } catch (err) {
        console.error("Erro ao buscar no Google Calendar:", err.message);
      }
    }

    // Combinar banco + google
    return res.json([...dbEvents, ...googleEvents]);
  } catch (err) {
    console.error("Erro ao listar eventos:", err);
    return res.status(500).json({ error: "Erro interno ao buscar eventos" });
  } finally {
    client.release();
  }
}