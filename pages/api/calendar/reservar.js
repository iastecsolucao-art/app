import { google } from "googleapis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { nome, telefone, start, servico } = req.body;

  try {
    // autenticação no Google
    const auth = new google.auth.GoogleAuth({
  keyFile: "credentials/service.json", // caminho para o arquivo
  scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendar = google.calendar({ version: "v3", auth });

    // Definir horário do evento (fixo 10h às 11h como exemplo)
    const startDate = new Date(start);
    startDate.setHours(10, 0, 0); // começa às 10h
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1); // +1h de duração

    // Criar evento no Calendar
    const event = {
      summary: `${servico} - ${nome}`,
      description: `Agendamento solicitado.\nNome: ${nome}\nTelefone: ${telefone}\nServiço: ${servico}`,
      start: { dateTime: startDate.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
    };

    const created = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
    });

    // 🔹 Enviar para o webhook do n8n
    await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        telefone,
        servico,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      }),
    });

    res.status(200).json({ message: "✅ Reserva confirmada!", id: created.data.id });
  } catch (error) {
    console.error("Erro ao reservar:", error);
    res.status(500).json({ error: "Erro ao reservar horário" });
  }
}