import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

const QUERY_VENDAS_VENDEDOR_MENSAL = `
WITH vendas_mes AS (
  SELECT
    seller_name,
    SUM(totalvalue) AS total_vendido_mes
  FROM view_vendas_completa
  JOIN calendario c ON view_vendas_completa.lastchangedate::date = c.data
  WHERE EXTRACT(YEAR FROM c.data) = $1
    AND EXTRACT(MONTH FROM c.data) = $2
  GROUP BY seller_name
),
metas_vendedor AS (
  SELECT
    seller_name,
    valor_cota,
    valor_super_cota,
    valor_cota_ouro
  FROM metas_vendedores
  WHERE ano = $1 AND mes = $2
)
SELECT
  m.seller_name,
  COALESCE(m.valor_cota, 0) AS meta_cota_mes,
  COALESCE(m.valor_super_cota, 0) AS meta_super_cota_mes,
  COALESCE(m.valor_cota_ouro, 0) AS meta_cota_ouro_mes,
  COALESCE(v.total_vendido_mes, 0) AS realizado_mes,
  CASE WHEN m.valor_cota > 0 THEN ROUND((COALESCE(v.total_vendido_mes, 0) / m.valor_cota) * 100, 2) ELSE 0 END AS pct_atingido_cota_mes,
  CASE WHEN m.valor_super_cota > 0 THEN ROUND((COALESCE(v.total_vendido_mes, 0) / m.valor_super_cota) * 100, 2) ELSE 0 END AS pct_atingido_super_mes,
  CASE WHEN m.valor_cota_ouro > 0 THEN ROUND((COALESCE(v.total_vendido_mes, 0) / m.valor_cota_ouro) * 100, 2) ELSE 0 END AS pct_atingido_ouro_mes
FROM metas_vendedor m
LEFT JOIN vendas_mes v ON m.seller_name = v.seller_name
ORDER BY m.seller_name;
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;

    const result = await pool.query(QUERY_VENDAS_VENDEDOR_MENSAL, [ano, mes]);

    res.status(200).json({ data: result.rows, mes, ano });
  } catch (error) {
    console.error("Erro API vendas_vendedor_mensal:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}