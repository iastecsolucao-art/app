import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL_VENDEDORES});

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { ano } = req.query;
    const year = parseInt(ano, 10);
    if (isNaN(year) || year < 1900 || year > 2100) {
      return res.status(400).json({ error: "Ano inválido" });
    }

    const result = await pool.query(
      `SELECT data FROM calendario WHERE EXTRACT(YEAR FROM data) = $1`,
      [year]
    );

    const datasCadastradas = result.rows.map((r) => r.data.toISOString().slice(0, 10));

    res.status(200).json({ datasCadastradas });
  } catch (error) {
    console.error("Erro API calendario datas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}