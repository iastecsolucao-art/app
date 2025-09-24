import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

const QUERY_RELATORIO_MENSAL = `
WITH metas_agrupadas AS (
  SELECT
    loja AS filial,
    (semana1 + semana2 + semana3 + semana4 + semana5 + semana6) AS meta_mes,
    cota_vendedor,
    comissao_loja,
    qtd_vendedor,
    valor_cota,
    valor_super_cota,
    valor_cota_ouro
  FROM metas_lojas
),
vendas_mes AS (
  SELECT
    v.loja AS filial,
    SUM(v.totalvalue) AS real_mes
  FROM view_vendas_completa v
  WHERE v.lastchangedate >= date_trunc('month', CURRENT_DATE)
    AND v.lastchangedate < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')
  GROUP BY v.loja
),
relatorio AS (
  SELECT
    m.filial,
    m.meta_mes,
    COALESCE(v.real_mes, 0) AS real_mes,
    CASE WHEN m.meta_mes > 0 THEN ROUND((COALESCE(v.real_mes, 0) / m.meta_mes) * 100, 2) ELSE 0 END AS pct_atingido,
    m.cota_vendedor,
    m.comissao_loja,
    m.qtd_vendedor,
    m.valor_cota,
    m.valor_super_cota,
    m.valor_cota_ouro
  FROM metas_agrupadas m
  LEFT JOIN vendas_mes v ON m.filial = v.filial
)
SELECT
  filial,
  meta_mes,
  real_mes,
  pct_atingido,
  cota_vendedor,
  comissao_loja,
  qtd_vendedor,
  valor_cota,
  valor_super_cota,
  valor_cota_ouro
FROM relatorio
ORDER BY filial;
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const result = await pool.query(QUERY_RELATORIO_MENSAL);

    const formatterMoeda = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const data = result.rows.map((row) => ({
      filial: row.filial,
      meta_mes: formatterMoeda.format(row.meta_mes || 0),
      real_mes: formatterMoeda.format(row.real_mes || 0),
      pct_atingido: `${row.pct_atingido.toFixed(2)}%`,
      cota_vendedor: row.cota_vendedor,
      comissao_loja: `${(row.comissao_loja * 100).toFixed(2)}%`,
      qtd_vendedor: row.qtd_vendedor,
      valor_cota: formatterMoeda.format(row.valor_cota || 0),
      valor_super_cota: formatterMoeda.format(row.valor_super_cota || 0),
      valor_cota_ouro: formatterMoeda.format(row.valor_cota_ouro || 0),
    }));

    res.status(200).json({ data });
  } catch (error) {
    console.error("Erro API relatorio_mensal:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}