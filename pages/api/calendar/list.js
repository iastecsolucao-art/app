import { google } from "googleapis";

export default async function handler(req, res) {
  try {
  const auth = new google.auth.GoogleAuth({
  keyFile: "credentials/service.json", // caminho para o arquivo
  scopes: ["https://www.googleapis.com/auth/calendar"],
});
    const calendar = google.calendar({ version: "v3", auth });

    const events = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: new Date().toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    const mapped = events.data.items.map(ev => ({
      title: ev.summary,
      start: ev.start.dateTime || ev.start.date,
      end: ev.end.dateTime || ev.end.date,
    }));

    res.status(200).json(mapped);
  } catch (error) {
    console.error("Erro ao listar eventos:", error);
    res.status(500).json({ error: "Erro ao listar eventos" });
  }
}