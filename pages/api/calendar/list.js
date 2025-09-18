import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não suportado" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  const client = await pool.connect();
  try {
    // Descobre empresa do usuário logado
    const usuario = await client.query(
      "SELECT empresa_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    const { empresa_id } = usuario.rows[0];

    // SELECT com JOIN em clientes e profissionais
    const query = `
      SELECT 
        a.id,
        a.data_inicio AS start,
        a.data_fim AS end,
        a.servico,
        a.obs,
        a.profissional_id,
        a.cliente_id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        p.nome AS profissional_nome,
        p.especialidade AS profissional_especialidade
      FROM agendamentos a
      LEFT JOIN clientes c ON c.id = a.cliente_id
      LEFT JOIN profissionais p ON p.id = a.profissional_id
      WHERE a.empresa_id = $1
      ORDER BY a.data_inicio ASC
    `;

    const result = await client.query(query, [empresa_id]);

    // 💡 Normalizar os eventos no formato que o FullCalendar entende
    const eventos = result.rows.map((row) => ({
      id: row.id,
      title: `${row.servico} - ${row.cliente_nome || "Sem cliente"} (${row.profissional_nome || "Sem profissional"})`,
      start: row.start,
      end: row.end,
      extendedProps: {
        servico: row.servico,
        cliente_id: row.cliente_id,
        cliente_nome: row.cliente_nome,
        cliente_telefone: row.cliente_telefone,
        profissional_id: row.profissional_id,
        profissional_nome: row.profissional_nome,
        profissional_especialidade: row.profissional_especialidade,
        obs: row.obs,
      }
    }));

    return res.json(eventos);
  } catch (err) {
    console.error("Erro ao listar agendamentos:", err);
    return res.status(500).json({ error: "Erro interno ao listar agendamentos" });
  } finally {
    client.release();
  }
}