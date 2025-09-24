// pages/api/agendamentos_horarios.js
import pool from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { profissional_id, servico_nome, data } = req.query;

  if (!profissional_id || !servico_nome || !data) {
    return res.status(400).json({ error: 'profissional_id, servico_nome e data são obrigatórios' });
  }

  try {
    // 1. Buscar duração do serviço
    const servicoRes = await pool.query(
      'SELECT duracao_minutos FROM servicos WHERE nome = $1 LIMIT 1',
      [servico_nome]
    );
    if (servicoRes.rowCount === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    const duracao = servicoRes.rows[0].duracao_minutos || 30;

    // 2. Obter dia da semana da data (ex: Segunda-feira)
    const diasSemana = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];
    const diaSemana = diasSemana[new Date(data).getDay()];

    // 3. Buscar horários do profissional para o dia da semana
    const horariosRes = await pool.query(
      `SELECT abertura, fechamento FROM horarios_estabelecimento 
       WHERE profissional_id = $1 AND dia_semana = $2 LIMIT 1`,
      [profissional_id, diaSemana]
    );
    if (horariosRes.rowCount === 0) {
      return res.status(404).json({ error: 'Horários não encontrados para o profissional neste dia' });
    }
    const { abertura, fechamento } = horariosRes.rows[0];

    // 4. Buscar agendamentos já feitos para o profissional na data
    const agendamentosRes = await pool.query(
      `SELECT data_inicio FROM agendamentos
       WHERE profissional_id = $1 AND DATE(data_inicio) = $2`,
      [profissional_id, data]
    );
    const agendamentos = agendamentosRes.rows.map(r => r.data_inicio.toTimeString().slice(0,5));

    // 5. Gerar horários possíveis com base na duração e intervalo
    function gerarHorarios(abertura, fechamento, duracao) {
      const horarios = [];
      let current = new Date(`1970-01-01T${abertura}`);
      const end = new Date(`1970-01-01T${fechamento}`);

      while (current <= end) {
        const h = current.toTimeString().slice(0,5);
        horarios.push(h);
        current = new Date(current.getTime() + duracao * 60000);
      }
      return horarios;
    }

    const possiveis = gerarHorarios(abertura, fechamento, duracao);

    // 6. Filtrar horários livres
    const livres = possiveis.filter(h => !agendamentos.includes(h));

    return res.status(200).json({ horarios: livres });
  } catch (error) {
    console.error("Erro na API agendamentos_horarios:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}