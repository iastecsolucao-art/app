import { google } from "googleapis";
import { getGoogleAuth } from "../../../utils/googleAuth";

export default async function handler(req, res) {
  try {
    const auth = getGoogleAuth();
    const calendar = google.calendar({ version: "v3", auth });

    const events = await calendar.events.list({
      calendarId: "24ab458dc01c948bd480a78034704a471c7110e35ad60a8d620d4c2a8628c11b@group.calendar.google.com",
      timeMin: new Date().toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    const mapped = (events.data.items || []).map(ev => ({
      title: ev.summary,
      start: ev.start.dateTime || ev.start.date,
      end: ev.end.dateTime || ev.end.date,
    }));

    res.status(200).json(mapped);
  } catch (err) {
    console.error("❌ Erro ao listar eventos:", err);
    res.status(500).json({ error: "Erro ao listar eventos", details: err.message });
  }
}