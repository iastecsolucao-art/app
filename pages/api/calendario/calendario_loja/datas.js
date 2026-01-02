// pages/api/calendario/calendario_loja/datas.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

/**
 * Retorna todas as datas cadastradas na tabela "calendario"
 * para o ano informado.
 *
 * Resposta: { datasCadastradas: ["2025-01-01", "2025-01-02", ...] }
 */
export default async function handler(req, res) {
  const { method, query } = req;

  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Método ${method} não permitido` });
  }

  try {
    const { ano } = query;

    if (!ano) {
      return res.status(400).json({ error: "Parâmetro 'ano' é obrigatório" });
    }

    const anoInt = parseInt(ano, 10);
    if (Number.isNaN(anoInt)) {
      return res.status(400).json({ error: "Ano inválido" });
    }

    // TABELA CORRETA: calendario (id, ano, semana, data, meta)
    const result = await pool.query(
      `
        SELECT DISTINCT data::date AS data
        FROM calendario
        WHERE ano = $1
        ORDER BY data
      `,
      [anoInt]
    );

    const datasCadastradas = result.rows.map((r) =>
      r.data.toISOString().slice(0, 10)
    );

    return res.status(200).json({ datasCadastradas });
  } catch (error) {
    console.error("Erro API calendario_loja/datas:", error);
    return res
      .status(500)
      .json({ error: "Erro interno do servidor", details: error.message });
  }
}
