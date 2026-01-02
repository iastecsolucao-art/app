// pages/api/calendario/calendario_loja/popular.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

/**
 * Popula a tabela "calendario" com todas as datas do ano informado.
 *
 * - Coluna ano: ano passado no body
 * - Coluna data: de 1/jan a 31/dez
 * - Coluna semana: calculada pelo PostgreSQL (EXTRACT(WEEK FROM data))
 * - meta: fica NULL
 */
export default async function handler(req, res) {
  const { method, body } = req;

  if (method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Método ${method} não permitido` });
  }

  try {
    const { ano } = body;

    if (!ano) {
      return res.status(400).json({ error: "Campo 'ano' é obrigatório" });
    }

    const anoInt = parseInt(ano, 10);
    if (Number.isNaN(anoInt)) {
      return res.status(400).json({ error: "Ano inválido" });
    }

    // Usa generate_series + make_date para gerar todas as datas do ano
    // e EXTRACT(WEEK FROM data) para preencher a coluna semana.
    // Só insere se ainda não existir aquele ano+data.
    const queryText = `
      INSERT INTO calendario (ano, semana, data, meta)
      SELECT
        $1::int AS ano,
        EXTRACT(WEEK FROM d)::int AS semana,
        d::date AS data,
        NULL::numeric(10,2) AS meta
      FROM generate_series(
        make_date($1::int, 1, 1),
        make_date($1::int, 12, 31),
        interval '1 day'
      ) AS d
      WHERE NOT EXISTS (
        SELECT 1
        FROM calendario c
        WHERE c.ano = $1::int
          AND c.data = d::date
      );
    `;

    await pool.query(queryText, [anoInt]);

    return res
      .status(200)
      .json({ message: `Calendário do ano ${anoInt} populado com sucesso!` });
  } catch (error) {
    console.error("Erro API calendario_loja/popular:", error);
    return res
      .status(500)
      .json({ error: "Erro interno do servidor", details: error.message });
  }
}
