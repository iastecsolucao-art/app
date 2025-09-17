import { google } from "googleapis";
import { getGoogleAuth } from "../../../utils/googleAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { nome, telefone, start, servico } = req.body;

  try {
    const auth = getGoogleAuth();
    const calendar = google.calendar({ version: "v3", auth });

    // Definir horário do evento (10h às 11h)
    const startDate = new Date(start);
    startDate.setHours(10, 0, 0);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    const event = {
      summary: `${servico} - ${nome}`,
      description: `Agendamento solicitado.
      Nome: ${nome}
      Telefone: ${telefone}
      Serviço: ${servico}`,
      start: { dateTime: startDate.toISOString(), timeZone: "America/Sao_Paulo" },
      end: { dateTime: endDate.toISOString(), timeZone: "America/Sao_Paulo" },
    };

    const created = await calendar.events.insert({
      calendarId: "24ab458dc01c948bd480a78034704a471c7110e35ad60a8d620d4c2a8628c11b@group.calendar.google.com",
      resource: event,
    });

    // 🔹 Enviar webhook pro n8n
    await fetch("https://n8n.iastec.servicos.ws/webhook/agendamento", {
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
  } catch (err) {
    console.error("❌ Erro ao reservar:", err);
    res.status(500).json({ error: "Erro ao reservar horário", details: err.message });
  }
}