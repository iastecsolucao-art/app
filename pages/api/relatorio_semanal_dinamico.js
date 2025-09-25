import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

const QUERY_RELATORIO_SEMANAL_DINAMICO = `
WITH semanas_mes AS (
  SELECT DISTINCT semana
  FROM calendario
  WHERE EXTRACT(YEAR FROM data) = $1
    AND EXTRACT(MONTH FROM data) = $2
  ORDER BY semana
),
num_semanas AS (
  SELECT COUNT(DISTINCT semana) AS total_semanas
  FROM calendario
  WHERE EXTRACT(YEAR FROM data) = $1
    AND EXTRACT(MONTH FROM data) = $2
),
metas AS (
  SELECT
    loja,
    valor_cota,
    valor_super_cota,
    valor_cota_ouro
  FROM metas_lojas
  WHERE mes = $2 AND ano = $1
),
vendas_mes AS (
  SELECT
    v.loja,
    SUM(v.totalvalue) AS total_vendido_mes
  FROM view_vendas_completa v
  JOIN calendario c ON v.lastchangedate::date = c.data
  WHERE EXTRACT(YEAR FROM c.data) = $1
    AND EXTRACT(MONTH FROM c.data) = $2
  GROUP BY v.loja
),
vendas_semana AS (
  SELECT
    v.loja,
    c.semana,
    SUM(v.totalvalue) AS total_vendido_semana
  FROM view_vendas_completa v
  JOIN calendario c ON v.lastchangedate::date = c.data
  WHERE c.semana IN (SELECT semana FROM semanas_mes)
  GROUP BY v.loja, c.semana
),
vendas_com_metas AS (
  SELECT
    m.loja,
    s.semana,
    COALESCE(vs.total_vendido_semana, 0) AS total_vendido_semana,
    m.valor_cota / ns.total_semanas AS meta_cota_semana,
    m.valor_super_cota / ns.total_semanas AS meta_super_cota_semana,
    m.valor_cota_ouro / ns.total_semanas AS meta_cota_ouro_semana
  FROM metas m
  CROSS JOIN semanas_mes s
  LEFT JOIN vendas_semana vs ON TRIM(UPPER(m.loja)) = TRIM(UPPER(vs.loja)) AND s.semana = vs.semana
  CROSS JOIN num_semanas ns
),
resumo_semana AS (
  SELECT
    loja,
    semana,
    SUM(total_vendido_semana) AS realizado_semana,
    MAX(meta_cota_semana) AS meta_cota_semana,
    MAX(meta_super_cota_semana) AS meta_super_cota_semana,
    MAX(meta_cota_ouro_semana) AS meta_cota_ouro_semana
  FROM vendas_com_metas
  GROUP BY loja, semana
),
lojas AS (
  SELECT DISTINCT loja FROM metas
),
lojas_semanas AS (
  SELECT l.loja, s.semana
  FROM lojas l CROSS JOIN semanas_mes s
),
dados_completos AS (
  SELECT
    ls.loja,
    ls.semana,
    COALESCE(rs.realizado_semana, 0) AS realizado_semana,
    COALESCE(rs.meta_cota_semana, 0) AS meta_cota_semana,
    COALESCE(rs.meta_super_cota_semana, 0) AS meta_super_cota_semana,
    COALESCE(rs.meta_cota_ouro_semana, 0) AS meta_cota_ouro_semana
  FROM lojas_semanas ls
  LEFT JOIN resumo_semana rs ON TRIM(UPPER(ls.loja)) = TRIM(UPPER(rs.loja)) AND ls.semana = rs.semana
)
SELECT
  m.loja,
  dc.semana,
  dc.realizado_semana,
  dc.meta_cota_semana,
  dc.meta_super_cota_semana,
  dc.meta_cota_ouro_semana,
  CASE WHEN dc.meta_cota_semana > 0 THEN ROUND((dc.realizado_semana / dc.meta_cota_semana) * 100, 2) ELSE 0 END AS pct_atingido_cota_semana,
  CASE WHEN dc.meta_super_cota_semana > 0 THEN ROUND((dc.realizado_semana / dc.meta_super_cota_semana) * 100, 2) ELSE 0 END AS pct_atingido_super_semana,
  CASE WHEN dc.meta_cota_ouro_semana > 0 THEN ROUND((dc.realizado_semana / dc.meta_cota_ouro_semana) * 100, 2) ELSE 0 END AS pct_atingido_ouro_semana,
  m.valor_cota AS meta_cota_mes,
  m.valor_super_cota AS meta_super_cota_mes,
  m.valor_cota_ouro AS meta_cota_ouro_mes,
  COALESCE(vm.total_vendido_mes, 0) AS realizado_mes,
  CASE WHEN m.valor_cota > 0 THEN ROUND((COALESCE(vm.total_vendido_mes, 0) / m.valor_cota) * 100, 2) ELSE 0 END AS pct_atingido_cota_mes,
  CASE WHEN m.valor_super_cota > 0 THEN ROUND((COALESCE(vm.total_vendido_mes, 0) / m.valor_super_cota) * 100, 2) ELSE 0 END AS pct_atingido_super_mes,
  CASE WHEN m.valor_cota_ouro > 0 THEN ROUND((COALESCE(vm.total_vendido_mes, 0) / m.valor_cota_ouro) * 100, 2) ELSE 0 END AS pct_atingido_ouro_mes,
  $2 AS mes,
  $1 AS ano
FROM dados_completos dc
RIGHT JOIN metas m ON TRIM(UPPER(dc.loja)) = TRIM(UPPER(m.loja))
LEFT JOIN vendas_mes vm ON TRIM(UPPER(m.loja)) = TRIM(UPPER(vm.loja))
ORDER BY m.loja, dc.semana;
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const ano = parseInt(req.query.ano) || new Date().getFullYear();
    const mes = parseInt(req.query.mes) || new Date().getMonth() + 1;

    const result = await pool.query(QUERY_RELATORIO_SEMANAL_DINAMICO, [
      ano,
      mes,
    ]);

    // Extrai semanas distintas e ordena
    const semanasSet = new Set(result.rows.map((r) => r.semana));
    const semanas = Array.from(semanasSet).sort((a, b) => a - b);

    // Agrupa dados por loja
    const lojasMap = new Map();

    result.rows.forEach((row) => {
      const loja = row.loja;
      if (!lojasMap.has(loja)) {
        lojasMap.set(loja, {
          loja,
          meta_cota_mes: row.meta_cota_mes,
          meta_super_cota_mes: row.meta_super_cota_mes,
          meta_cota_ouro_mes: row.meta_cota_ouro_mes,
          realizado_mes: row.realizado_mes,
          pct_atingido_cota_mes: row.pct_atingido_cota_mes,
          pct_atingido_super_mes: row.pct_atingido_super_mes,
          pct_atingido_ouro_mes: row.pct_atingido_ouro_mes,
          semanas: {},
          mes: row.mes,
          ano: row.ano,
        });
      }
      lojasMap.get(loja).semanas[row.semana] = {
        realizado: row.realizado_semana,
        meta_cota: row.meta_cota_semana,
        meta_super_cota: row.meta_super_cota_semana,
        meta_cota_ouro: row.meta_cota_ouro_semana,
        pct_atingido_cota: row.pct_atingido_cota_semana,
        pct_atingido_super: row.pct_atingido_super_semana,
        pct_atingido_ouro: row.pct_atingido_ouro_semana,
      };
    });

    // Preenche semanas faltantes com zeros para cada loja
    const data = Array.from(lojasMap.values()).map((loja) => {
      semanas.forEach((sem) => {
        if (!loja.semanas[sem]) {
          loja.semanas[sem] = {
            realizado: 0,
            meta_cota: 0,
            meta_super_cota: 0,
            meta_cota_ouro: 0,
            pct_atingido_cota: 0,
            pct_atingido_super: 0,
            pct_atingido_ouro: 0,
          };
        }
      });
      return loja;
    });

    res.status(200).json({ data, semanas, mes, ano });
  } catch (error) {
    console.error("Erro API relatorio_semanal_dinamico:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}