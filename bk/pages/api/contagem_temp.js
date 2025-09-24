import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Método ${req.method} não permitido`);
  }

  const client = await pool.connect();
  try {
    const { setor, operador, loja, codigo, descricao, quantidade, data, id_contagem } = req.body;

    if (!setor || !operador || !loja || !codigo) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    // Insere registro parcial (contagem temporária)
    const result = await client.query(
      `INSERT INTO contagem_temp 
        (setor, operador, loja, codigo, descricao, quantidade, data, id_contagem)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id_contagem`,
      [setor, operador, loja, codigo, descricao, quantidade || 1, data || new Date().toISOString().slice(0, 10), id_contagem || null]
    );

    return res.status(201).json({ id_contagem: result.rows[0].id_contagem });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno ao salvar contagem temporária" });
  } finally {
    client.release();
  }
}