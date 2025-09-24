import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

// Query para agrupamento por loja com 6 semanas e cálculo de cota e comissão
const QUERY_LOJA = `
WITH vendas_semana AS (
  SELECT
    v.loja,
    c.semana AS semana_fiscal,
    v.lastchangedate::date AS data_venda,
    SUM(v.totalvalue) AS total_vendido
  FROM
    view_vendas_completa v
  JOIN
    calendario c ON v.lastchangedate::date = c.data
  GROUP BY
    v.loja,
    c.semana,
    v.lastchangedate::date
),
vendas_com_semana_mes AS (
  SELECT
    loja,
    semana_fiscal,
    data_venda,
    total_vendido,
    CEIL(EXTRACT(DAY FROM data_venda) / 7.0) AS semana_do_mes
  FROM
    vendas_semana
),
vendas_com_metas AS (
  SELECT
    v.loja,
    v.semana_fiscal,
    v.semana_do_mes,
    v.total_vendido,
    m.semana1,
    m.semana2,
    m.semana3,
    m.semana4,
    m.semana5,
    m.semana6,
    CASE v.semana_do_mes
      WHEN 1 THEN m.semana1
      WHEN 2 THEN m.semana2
      WHEN 3 THEN m.semana3
      WHEN 4 THEN m.semana4
      WHEN 5 THEN m.semana5
      WHEN 6 THEN m.semana6
      ELSE 0
    END AS meta_semana,
    0.05 AS taxa_comissao
  FROM
    vendas_com_semana_mes v
  JOIN
    metas_lojas m ON TRIM(UPPER(v.loja)) = TRIM(UPPER(m.loja))
),
resumo AS (
  SELECT
    loja,
    semana_do_mes,
    SUM(total_vendido) AS real,
    MAX(meta_semana) AS meta,
    MAX(taxa_comissao) AS taxa_comissao
  FROM
    vendas_com_metas
  GROUP BY
    loja,
    semana_do_mes
)
SELECT
  loja,
  COALESCE(MAX(CASE WHEN semana_do_mes = 1 THEN real END), 0) AS real_semana1,
  COALESCE(MAX(CASE WHEN semana_do_mes = 1 THEN meta END), 0) AS semana1,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 1 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 1 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 1 THEN meta END)
       ELSE 0
  END AS pct_cota_semana1,
  COALESCE(MAX(CASE WHEN semana_do_mes = 1 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana1,

  COALESCE(MAX(CASE WHEN semana_do_mes = 2 THEN real END), 0) AS real_semana2,
  COALESCE(MAX(CASE WHEN semana_do_mes = 2 THEN meta END), 0) AS semana2,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 2 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 2 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 2 THEN meta END)
       ELSE 0
  END AS pct_cota_semana2,
  COALESCE(MAX(CASE WHEN semana_do_mes = 2 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana2,

  COALESCE(MAX(CASE WHEN semana_do_mes = 3 THEN real END), 0) AS real_semana3,
  COALESCE(MAX(CASE WHEN semana_do_mes = 3 THEN meta END), 0) AS semana3,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 3 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 3 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 3 THEN meta END)
       ELSE 0
  END AS pct_cota_semana3,
  COALESCE(MAX(CASE WHEN semana_do_mes = 3 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana3,

  COALESCE(MAX(CASE WHEN semana_do_mes = 4 THEN real END), 0) AS real_semana4,
  COALESCE(MAX(CASE WHEN semana_do_mes = 4 THEN meta END), 0) AS semana4,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 4 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 4 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 4 THEN meta END)
       ELSE 0
  END AS pct_cota_semana4,
  COALESCE(MAX(CASE WHEN semana_do_mes = 4 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana4,

  COALESCE(MAX(CASE WHEN semana_do_mes = 5 THEN real END), 0) AS real_semana5,
  COALESCE(MAX(CASE WHEN semana_do_mes = 5 THEN meta END), 0) AS semana5,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 5 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 5 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 5 THEN meta END)
       ELSE 0
  END AS pct_cota_semana5,
  COALESCE(MAX(CASE WHEN semana_do_mes = 5 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana5,

  COALESCE(MAX(CASE WHEN semana_do_mes = 6 THEN real END), 0) AS real_semana6,
  COALESCE(MAX(CASE WHEN semana_do_mes = 6 THEN meta END), 0) AS semana6,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 6 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 6 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 6 THEN meta END)
       ELSE 0
  END AS pct_cota_semana6,
  COALESCE(MAX(CASE WHEN semana_do_mes = 6 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana6
FROM
  resumo
GROUP BY
  loja
ORDER BY
  loja;
`;

// Query para agrupamento por loja e vendedor com 6 semanas
const QUERY_LOJA_VENDEDOR = `
WITH vendas_semana AS (
  SELECT
    v.loja,
    v.seller_name,
    c.semana AS semana_fiscal,
    v.lastchangedate::date AS data_venda,
    SUM(v.totalvalue) AS total_vendido
  FROM
    view_vendas_completa v
  JOIN
    calendario c ON v.lastchangedate::date = c.data
  GROUP BY
    v.loja,
    v.seller_name,
    c.semana,
    v.lastchangedate::date
),
vendas_com_semana_mes AS (
  SELECT
    loja,
    seller_name,
    semana_fiscal,
    data_venda,
    total_vendido,
    CEIL(EXTRACT(DAY FROM data_venda) / 7.0) AS semana_do_mes
  FROM
    vendas_semana
),
vendas_com_metas AS (
  SELECT
    v.loja,
    v.seller_name,
    v.semana_fiscal,
    v.semana_do_mes,
    v.total_vendido,
    m.semana1,
    m.semana2,
    m.semana3,
    m.semana4,
    m.semana5,
    m.semana6,
    CASE v.semana_do_mes
      WHEN 1 THEN m.semana1
      WHEN 2 THEN m.semana2
      WHEN 3 THEN m.semana3
      WHEN 4 THEN m.semana4
      WHEN 5 THEN m.semana5
      WHEN 6 THEN m.semana6
      ELSE 0
    END AS meta_semana,
    0.05 AS taxa_comissao
  FROM
    vendas_com_semana_mes v
  JOIN
    metas_lojas m ON TRIM(UPPER(v.loja)) = TRIM(UPPER(m.loja))
),
resumo AS (
  SELECT
    loja,
    seller_name,
    semana_do_mes,
    SUM(total_vendido) AS real,
    MAX(meta_semana) AS meta,
    MAX(taxa_comissao) AS taxa_comissao
  FROM
    vendas_com_metas
  GROUP BY
    loja,
    seller_name,
    semana_do_mes
)
SELECT
  loja,
  seller_name,
  COALESCE(MAX(CASE WHEN semana_do_mes = 1 THEN real END), 0) AS real_semana1,
  COALESCE(MAX(CASE WHEN semana_do_mes = 1 THEN meta END), 0) AS semana1,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 1 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 1 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 1 THEN meta END)
       ELSE 0
  END AS pct_cota_semana1,
  COALESCE(MAX(CASE WHEN semana_do_mes = 1 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana1,

  COALESCE(MAX(CASE WHEN semana_do_mes = 2 THEN real END), 0) AS real_semana2,
  COALESCE(MAX(CASE WHEN semana_do_mes = 2 THEN meta END), 0) AS semana2,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 2 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 2 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 2 THEN meta END)
       ELSE 0
  END AS pct_cota_semana2,
  COALESCE(MAX(CASE WHEN semana_do_mes = 2 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana2,

  COALESCE(MAX(CASE WHEN semana_do_mes = 3 THEN real END), 0) AS real_semana3,
  COALESCE(MAX(CASE WHEN semana_do_mes = 3 THEN meta END), 0) AS semana3,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 3 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 3 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 3 THEN meta END)
       ELSE 0
  END AS pct_cota_semana3,
  COALESCE(MAX(CASE WHEN semana_do_mes = 3 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana3,

  COALESCE(MAX(CASE WHEN semana_do_mes = 4 THEN real END), 0) AS real_semana4,
  COALESCE(MAX(CASE WHEN semana_do_mes = 4 THEN meta END), 0) AS semana4,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 4 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 4 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 4 THEN meta END)
       ELSE 0
  END AS pct_cota_semana4,
  COALESCE(MAX(CASE WHEN semana_do_mes = 4 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana4,

  COALESCE(MAX(CASE WHEN semana_do_mes = 5 THEN real END), 0) AS real_semana5,
  COALESCE(MAX(CASE WHEN semana_do_mes = 5 THEN meta END), 0) AS semana5,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 5 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 5 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 5 THEN meta END)
       ELSE 0
  END AS pct_cota_semana5,
  COALESCE(MAX(CASE WHEN semana_do_mes = 5 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana5,

  COALESCE(MAX(CASE WHEN semana_do_mes = 6 THEN real END), 0) AS real_semana6,
  COALESCE(MAX(CASE WHEN semana_do_mes = 6 THEN meta END), 0) AS semana6,
  CASE WHEN COALESCE(MAX(CASE WHEN semana_do_mes = 6 THEN meta END), 0) > 0
       THEN COALESCE(MAX(CASE WHEN semana_do_mes = 6 THEN real END), 0) / MAX(CASE WHEN semana_do_mes = 6 THEN meta END)
       ELSE 0
  END AS pct_cota_semana6,
  COALESCE(MAX(CASE WHEN semana_do_mes = 6 THEN real END), 0) * COALESCE(MAX(taxa_comissao), 0) AS comissao_semana6
FROM
  resumo
GROUP BY
  loja,
  seller_name
ORDER BY
  loja,
  seller_name;
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const resultLoja = await pool.query(QUERY_LOJA);
    const resultLojaVendedor = await pool.query(QUERY_LOJA_VENDEDOR);

    res.status(200).json({
      dataLoja: resultLoja.rows,
      dataLojaVendedor: resultLojaVendedor.rows,
    });
  } catch (error) {
    console.error("Erro API relatorio_semanal:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}