import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

const QUERY_VENDAS_VENDEDOR_MENSAL_FILTROS = `
WITH metas_lojas_mes AS (
  SELECT
    m.loja,
    m.cota_semana1,
    m.cota_semana2,
    m.cota_semana3,
    m.cota_semana4,
    m.cota_semana5,
    m.cota_semana6,
    m.semana1,
    m.semana2,
    m.semana3,
    m.semana4,
    m.semana5,
    m.semana6
  FROM public.metas_lojas m
  WHERE m.ano = $1 AND m.mes = $2
    AND ($3::text IS NULL OR m.loja = $3)
),
qtd_vendedores AS (
  SELECT loja, COUNT(DISTINCT seller_name) AS qtd
  FROM view_vendas_completa
  WHERE EXTRACT(YEAR FROM lastchangedate) = $1
    AND EXTRACT(MONTH FROM lastchangedate) = $2
  GROUP BY loja
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
),
vendas_semanais_completas AS (
  SELECT
    v.seller_name,
    v.loja,
    s.semana,
    COALESCE(vs.total_vendido_semana, 0) AS total_vendido_semana
  FROM (
    SELECT DISTINCT loja, seller_name FROM view_vendas_completa
    WHERE ($3::text IS NULL OR loja = $3)
      AND ($4::text IS NULL OR seller_name = $4)
  ) v
  CROSS JOIN (
    SELECT DISTINCT (EXTRACT(WEEK FROM data) - EXTRACT(WEEK FROM DATE_TRUNC('month', data)) + 1)::int AS semana
    FROM calendario
    WHERE EXTRACT(YEAR FROM data) = $1 AND EXTRACT(MONTH FROM data) = $2
  ) s
  LEFT JOIN vendas_semanais vs ON v.loja = vs.loja AND v.seller_name = vs.seller_name AND s.semana = vs.semana_mes
),
vendas_semana_detalhe AS (
  SELECT
    vsc.seller_name,
    vsc.loja,
    vsc.semana AS semana_mes,
    vsc.total_vendido_semana,
    CASE vsc.semana
      WHEN 1 THEN (m.cota_semana1 / NULLIF(qv.qtd, 0))
      WHEN 2 THEN (m.cota_semana2 / NULLIF(qv.qtd, 0))
      WHEN 3 THEN (m.cota_semana3 / NULLIF(qv.qtd, 0))
      WHEN 4 THEN (m.cota_semana4 / NULLIF(qv.qtd, 0))
      WHEN 5 THEN (m.cota_semana5 / NULLIF(qv.qtd, 0))
      WHEN 6 THEN (m.cota_semana6 / NULLIF(qv.qtd, 0))
      ELSE 0
    END AS meta_semana,
    CASE vsc.semana
      WHEN 1 THEN vsc.total_vendido_semana * (m.semana1::numeric / 100.0)
      WHEN 2 THEN vsc.total_vendido_semana * (m.semana2::numeric / 100.0)
      WHEN 3 THEN vsc.total_vendido_semana * (m.semana3::numeric / 100.0)
      WHEN 4 THEN vsc.total_vendido_semana * (m.semana4::numeric / 100.0)
      WHEN 5 THEN vsc.total_vendido_semana * (m.semana5::numeric / 100.0)
      WHEN 6 THEN vsc.total_vendido_semana * (m.semana6::numeric / 100.0)
      ELSE 0
    END AS comissao_semana
  FROM vendas_semanais_completas vsc
  JOIN metas_lojas_mes m ON vsc.loja = m.loja
  LEFT JOIN qtd_vendedores qv ON vsc.loja = qv.loja
)
SELECT
  v.seller_name,
  v.loja,
  SUM(v.total_vendido_semana) AS realizado_mes,
  SUM(v.meta_semana) AS meta_mes,
  SUM(v.comissao_semana) AS comissao_total_mes,
  COALESCE(json_agg(
    json_build_object(
      'semana', 'S' || v.semana_mes,
      'realizado', v.total_vendido_semana,
      'meta', v.meta_semana,
      'comissao', v.comissao_semana
    ) ORDER BY v.semana_mes
  ) FILTER (WHERE v.semana_mes IS NOT NULL), '[]') AS detalhe_semanal
FROM vendas_semana_detalhe v
GROUP BY v.seller_name, v.loja
ORDER BY v.loja, v.seller_name;
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;
    const loja = req.query.loja || null;
    const vendedor = req.query.vendedor || null;

    const result = await pool.query(QUERY_VENDAS_VENDEDOR_MENSAL_FILTROS, [ano, mes, loja, vendedor]);

    res.status(200).json({ data: result.rows, mes, ano });
  } catch (error) {
    console.error("Erro API vendas_vendedor_mensal_filtros:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}