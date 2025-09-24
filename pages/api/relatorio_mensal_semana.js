import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

const QUERY_RELATORIO_MENSAL_SEMANA = `
WITH vendas_semana AS (
  SELECT
    v.loja,
    c.semana AS semana_fiscal,
    SUM(v.totalvalue) AS total_vendido
  FROM
    view_vendas_completa v
  JOIN
    calendario c ON v.lastchangedate::date = c.data
  WHERE
    v.lastchangedate >= date_trunc('month', CURRENT_DATE)
    AND v.lastchangedate < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')
  GROUP BY
    v.loja,
    c.semana
),
metas AS (
  SELECT
    loja,
    semana1,
    semana2,
    semana3,
    semana4,
    semana5,
    semana6
  FROM metas_lojas
),
vendas_com_metas AS (
  SELECT
    v.loja,
    v.semana_fiscal,
    v.total_vendido,
    CASE v.semana_fiscal
      WHEN (SELECT semana FROM calendario WHERE data = date_trunc('month', CURRENT_DATE) + INTERVAL '0 week') THEN m.semana1
      WHEN (SELECT semana FROM calendario WHERE data = date_trunc('month', CURRENT_DATE) + INTERVAL '1 week') THEN m.semana2
      WHEN (SELECT semana FROM calendario WHERE data = date_trunc('month', CURRENT_DATE) + INTERVAL '2 week') THEN m.semana3
      WHEN (SELECT semana FROM calendario WHERE data = date_trunc('month', CURRENT_DATE) + INTERVAL '3 week') THEN m.semana4
      WHEN (SELECT semana FROM calendario WHERE data = date_trunc('month', CURRENT_DATE) + INTERVAL '4 week') THEN m.semana5
      WHEN (SELECT semana FROM calendario WHERE data = date_trunc('month', CURRENT_DATE) + INTERVAL '5 week') THEN m.semana6
      ELSE 0
    END AS meta_semana
  FROM vendas_semana v
  JOIN metas m ON TRIM(UPPER(v.loja)) = TRIM(UPPER(m.loja))
),
resumo AS (
  SELECT
    loja,
    semana_fiscal,
    SUM(total_vendido) AS realizado,
    MAX(meta_semana) AS meta
  FROM vendas_com_metas
  GROUP BY loja, semana_fiscal
),
mes_agrupado AS (
  SELECT
    loja,
    SUM(meta) AS meta_mes,
    SUM(realizado) AS realizado_mes
  FROM resumo
  GROUP BY loja
)
SELECT
  r.loja,
  r.semana_fiscal,
  r.realizado,
  r.meta,
  CASE WHEN r.meta > 0 THEN ROUND((r.realizado / r.meta) * 100, 2) ELSE 0 END AS pct_atingido,
  ma.meta_mes,
  ma.realizado_mes
FROM resumo r
JOIN mes_agrupado ma ON ma.loja = r.loja
ORDER BY r.loja, r.semana_fiscal;
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const result = await pool.query(QUERY_RELATORIO_MENSAL_SEMANA);

    // Organizar os dados para frontend: pivotar semanas em colunas por loja
    const lojasMap = new Map();

    result.rows.forEach((row) => {
      const loja = row.loja;
      if (!lojasMap.has(loja)) {
        lojasMap.set(loja, {
          loja,
          meta_mes: row.meta_mes,
          realizado_mes: row.realizado_mes,
          semanas: {},
        });
      }
      lojasMap.get(loja).semanas[row.semana_fiscal] = {
        realizado: row.realizado,
        meta: row.meta,
        pct_atingido: row.pct_atingido,
      };
    });

    // Transformar em array e ordenar semanas
    const data = Array.from(lojasMap.values()).map((loja) => {
      // Para garantir as 6 semanas, preencher zeros se faltar
      for (let i = 1; i <= 6; i++) {
        if (!loja.semanas[i]) {
          loja.semanas[i] = { realizado: 0, meta: 0, pct_atingido: 0 };
        }
      }
      return loja;
    });

    res.status(200).json({ data });
  } catch (error) {
    console.error("Erro API relatorio_mensal_semana:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}