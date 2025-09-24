import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Método ${req.method} não permitido`);
  }

  const client = await pool.connect();
  try {
    const { produtos } = req.body;

    if (!Array.isArray(produtos) || produtos.length === 0) {
      return res.status(400).json({ error: "Nenhum produto para finalizar" });
    }

    const queryText = `
      INSERT INTO contagem_finalizada 
        (usuario_email, setor, codigo, descricao, quantidade, finalizado_em, setor_finalizado, loja, nome)
      VALUES 
        ${produtos.map((_, i) => `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, NOW(), true, $${i * 7 + 6}, $${i * 7 + 7})`).join(", ")}
      RETURNING id
    `;

    const values = produtos.flatMap(p => [
      p.usuario_email || null,
      p.setor,
      p.codigo,
      p.descricao,
      p.quantidade || 1,
      p.loja,
      p.nome || null,
    ]);

    await client.query(queryText, values);

    return res.status(201).json({ status: "ok", message: "Contagem finalizada com sucesso" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno ao finalizar contagem" });
  } finally {
    client.release();
  }
}