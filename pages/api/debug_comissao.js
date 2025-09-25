import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES, // ajuste conforme sua config
});

export default async function handler(req, res) {
  const { ano, mes, loja, vendedor } = req.query;

  try {
    const query = `
      WITH metas_lojas_mes AS (
        SELECT
          m.loja,
          m.cota_semana1,
          m.cota_semana2,
          m.cota_semana3,
          m.cota_semana4,
          m.cota_semana5,
          m.cota_semana6
        FROM metas_lojas m
        WHERE m.ano = $1 AND m.mes = $2
          AND ($3::text IS NULL OR m.loja = $3)
      ),
      vendas_semanais AS (
        SELECT
          v.seller_name,
          v.loja,
          (EXTRACT(WEEK FROM c.data) - EXTRACT(WEEK FROM DATE_TRUNC('month', c.data)) + 1)::int AS semana_mes,
          SUM(v.totalvalue) AS total_vendido_semana
        FROM view_vendas_completa v
        JOIN calendario c ON v.lastchangedate::date = c.data
        WHERE EXTRACT(YEAR FROM c.data) = $1
          AND EXTRACT(MONTH FROM c.data) = $2
          AND ($3::text IS NULL OR v.loja = $3)
          AND ($4::text IS NULL OR v.seller_name = $4)
        GROUP BY v.seller_name, v.loja, semana_mes
      )
      SELECT
        v.seller_name,
        v.loja,
        v.semana_mes,
        v.total_vendido_semana,
        CASE v.semana_mes
          WHEN 1 THEN m.cota_semana1
          WHEN 2 THEN m.cota_semana2
          WHEN 3 THEN m.cota_semana3
          WHEN 4 THEN m.cota_semana4
          WHEN 5 THEN m.cota_semana5
          WHEN 6 THEN m.cota_semana6
          ELSE 0
        END AS cota_semana,
        CASE v.semana_mes
          WHEN 1 THEN v.total_vendido_semana * (m.cota_semana2 / 100.0)
          WHEN 2 THEN v.total_vendido_semana * (m.cota_semana3 / 100.0)
          WHEN 3 THEN v.total_vendido_semana * (m.cota_semana4 / 100.0)
          WHEN 4 THEN v.total_vendido_semana * (m.cota_semana5 / 100.0)
          WHEN 5 THEN v.total_vendido_semana * (m.cota_semana6 / 100.0)
          WHEN 6 THEN 0
          ELSE 0
        END AS comissao_calculada
      FROM vendas_semanais v
      JOIN metas_lojas_mes m ON v.loja = m.loja
      ORDER BY v.loja, v.seller_name, v.semana_mes
    `;

    const values = [ano, mes, loja || null, vendedor || null];
    const { rows } = await pool.query(query, values);

    res.status(200).json({ data: rows });
  } catch (error) {
    console.error("Erro no endpoint debug_comissao:", error);
    res.status(500).json({ error: "Erro interno" });
  }
}