import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const client = await pool.connect();
  try {
    // Buscar setores, operadores e lojas distintos da tabela contagem_apoio
    const setoresRes = await client.query("SELECT DISTINCT setor FROM contagem_apoio ORDER BY setor");
    const operadoresRes = await client.query("SELECT DISTINCT operador FROM contagem_apoio ORDER BY operador");
    const lojasRes = await client.query("SELECT DISTINCT loja FROM contagem_apoio ORDER BY loja");

    return res.status(200).json({
      setores: setoresRes.rows.map(r => r.setor),
      operadores: operadoresRes.rows.map(r => r.operador),
      lojas: lojasRes.rows.map(r => r.loja),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno" });
  } finally {
    client.release();
  }
}