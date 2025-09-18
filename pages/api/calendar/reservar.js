import { Pool } from "pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";

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

    // pega usuário logado
    const usuario = await client.query(
      "SELECT id, empresa_id FROM usuarios WHERE email=$1",
      [session.user.email]
    );
    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    const { id: usuario_id, empresa_id } = usuario.rows[0];

    // monta horários
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + 60 * 60000);

    // título e descrição
    const titulo = `${servico} - ${nome}`;
    const descricao = `Nome: ${nome}\nTelefone: ${telefone}\nServiço: ${servico}\nProfissional: ${profissional}\nObs: ${obs || ""}`;

    // INSERE agendamento com cliente_id
    const result = await client.query(
      `INSERT INTO agendamentos 
        (empresa_id, usuario_id, cliente_id, titulo, descricao, data_inicio, data_fim, servico, profissional_id, telefone, nome, obs)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        empresa_id,
        usuario_id,
        cliente,       // FK para clientes.id
        titulo,
        descricao,
        startDate,
        endDate,
        servico,
        profissional,
        telefone,
        nome,
        obs
      ]
    );

    // 🔹 Webhook para n8n (mantendo compatibilidade)
    await fetch("https://n8n.iastec.servicos.ws/webhook/agendamento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: cliente,
        nome,
        telefone,
        servico,
        profissional,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        obs
      }),
    });

    return res.json({ message: "Agendamento criado com sucesso!", id: result.rows[0].id });

  } catch (err) {
    console.error("Erro ao reservar:", err);
    return res.status(500).json({ error: "Erro interno ao reservar", details: err.message });
  } finally {
    client.release();
  }
}