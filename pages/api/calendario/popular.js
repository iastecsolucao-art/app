import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL_VENDEDORES });

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { ano } = req.body;
    const year = parseInt(ano, 10);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({ error: "Ano inválido" });
    }

    // Função para obter a segunda-feira da semana da data
    function getMonday(d) {
      const date = new Date(d);
      const day = date.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      date.setDate(date.getDate() + diff);
      return date;
    }

    // Gera todas as datas do ano
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 1);
    const dates = [];
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    // Agrupa as datas por semana (segunda a domingo)
    const weeksMap = new Map();

    dates.forEach((date) => {
      const monday = getMonday(date);
      const key = monday.toISOString().slice(0, 10);
      if (!weeksMap.has(key)) {
        weeksMap.set(key, []);
      }
      weeksMap.get(key).push(date);
    });

    // Insere no banco, evitando duplicatas (usando ON CONFLICT DO NOTHING)
    let insertedCount = 0;
    for (const [monday, weekDates] of weeksMap.entries()) {
      // semana = número sequencial da semana no ano (opcional)
      // aqui só inserimos as datas com ano e semana (calculada pelo número da semana do ano)
      for (const date of weekDates) {
        const ano = date.getFullYear();
        // calcular número da semana ISO (segunda-feira como início)
        const semana = getWeekNumber(date);

        const dataISO = date.toISOString().slice(0, 10);

        const query = `
          INSERT INTO calendario (ano, semana, data)
          VALUES ($1, $2, $3)
          ON CONFLICT (ano, semana, data) DO NOTHING
        `;
        const values = [ano, semana, dataISO];
        await pool.query(query, values);
        insertedCount++;
      }
    }

    res.status(200).json({ message: `Inseridas ${insertedCount} datas no calendário.` });
  } catch (error) {
    console.error("Erro API popular calendario:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// Função para calcular número da semana ISO (segunda-feira como início)
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}