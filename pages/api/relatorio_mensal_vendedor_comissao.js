import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

const QUERY_VENDAS_VENDEDOR_MENSAL_FILTROS = `
WITH metas_lojas_mes AS (
  SELECT
    m.loja,
    m.cota_vendedor,
    m.super_cota,
    m.cota_ouro,
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
    m.semana6,
    m.qtd_vendedor
  FROM public.metas_lojas m
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
      WHEN 1 THEN (m.cota_semana1 / NULLIF(m.qtd_vendedor, 0))
      WHEN 2 THEN (m.cota_semana2 / NULLIF(m.qtd_vendedor, 0))
      WHEN 3 THEN (m.cota_semana3 / NULLIF(m.qtd_vendedor, 0))
      WHEN 4 THEN (m.cota_semana4 / NULLIF(m.qtd_vendedor, 0))
      WHEN 5 THEN (m.cota_semana5 / NULLIF(m.qtd_vendedor, 0))
      WHEN 6 THEN (m.cota_semana6 / NULLIF(m.qtd_vendedor, 0))
      ELSE 0
    END AS meta_semana,
    m.cota_vendedor,
    m.super_cota,
    m.cota_ouro,
    CASE vsc.semana
      WHEN 1 THEN (m.semana1::numeric / 100.0)
      WHEN 2 THEN (m.semana2::numeric / 100.0)
      WHEN 3 THEN (m.semana3::numeric / 100.0)
      WHEN 4 THEN (m.semana4::numeric / 100.0)
      WHEN 5 THEN (m.semana5::numeric / 100.0)
      WHEN 6 THEN (m.semana6::numeric / 100.0)
      ELSE 0
    END AS percentual_comissao_semana
  FROM vendas_semanais_completas vsc
  JOIN metas_lojas_mes m ON vsc.loja = m.loja
)
SELECT
  v.seller_name,
  v.loja,
  SUM(v.total_vendido_semana) AS realizado_mes,
  SUM(v.meta_semana) AS meta_mes,
  SUM(
    CASE 
      WHEN v.meta_semana = 0 THEN 0
      ELSE
        v.total_vendido_semana * 
        CASE
          WHEN v.total_vendido_semana / v.meta_semana <= 1.20 THEN v.cota_vendedor / 100.0
          WHEN v.total_vendido_semana / v.meta_semana > 1.20 AND v.total_vendido_semana / v.meta_semana <= 1.40 THEN v.super_cota / 100.0
          ELSE v.cota_ouro / 100.0
        END
    END
  ) AS comissao_total_mes,
  COALESCE(json_agg(
    json_build_object(
      'semana', 'S' || v.semana_mes,
      'realizado', v.total_vendido_semana,
      'meta', v.meta_semana,
      'comissao', 
        CASE 
          WHEN v.meta_semana = 0 THEN 0
          ELSE
            v.total_vendido_semana * 
            CASE
              WHEN v.total_vendido_semana / v.meta_semana <= 1.20 THEN v.cota_vendedor / 100.0
              WHEN v.total_vendido_semana / v.meta_semana > 1.20 AND v.total_vendido_semana / v.meta_semana <= 1.40 THEN v.super_cota / 100.0
              ELSE v.cota_ouro / 100.0
            END
        END,
      'cota_vendedor', v.cota_vendedor,
      'super_cota', v.super_cota,
      'cota_ouro', v.cota_ouro
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