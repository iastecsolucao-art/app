// /pages/api/relatorio_mensal_vendedor_comissao.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

/*
  Regras:
  - Clip mensal: tudo (realizado/meta) considera só datas do mês $2.
  - Filtro ?semana=40,41 restringe às semanas ISO do mês (filtro adicional).
  - Meta semanal por loja: calendario_loja.meta; fallback: MAX(calendario.meta) da semana no mês.
  - Distribuição da meta por vendedor: meta_semana_loja / qtd_de_vendedores_no_relatorio (por loja+semana).
    => Garantido: Subtotal da loja por semana = meta_semana_loja; soma das semanas = meta mensal.
*/

const QUERY_VENDAS_VENDEDOR_MENSAL_FILTROS = `
WITH metas_lojas_mes AS (
  SELECT
    m.loja,
    m.cota_vendedor,
    m.super_cota,
    m.cota_ouro,
    m.abaixo_cota
  FROM public.metas_lojas m
  WHERE m.ano = $1 AND m.mes = $2
    AND ($3::text[] IS NULL OR m.loja = ANY($3::text[]))
),

-- semanas ISO válidas do mês (e filtradas, se $6 vier)
semanas_no_mes AS (
  SELECT DISTINCT c.semana::int AS semana_iso
  FROM calendario c
  WHERE EXTRACT(YEAR FROM c.data) = $1
    AND EXTRACT(MONTH FROM c.data) = $2
    AND ($6::int[] IS NULL OR c.semana = ANY($6::int[]))
),

-- fallback global por semana do mês (se não houver meta na calendario_loja)
metas_semanais_globais AS (
  SELECT
    c.semana::int AS semana_iso,
    COALESCE(MAX(c.meta), 0)::numeric AS meta_global
  FROM calendario c
  JOIN semanas_no_mes s ON s.semana_iso = c.semana
  WHERE EXTRACT(YEAR FROM c.data) = $1
    AND EXTRACT(MONTH FROM c.data) = $2
  GROUP BY c.semana
),

-- meta semanal por loja (prioriza calendario_loja; se não houver, usa global)
metas_semanais_loja AS (
  SELECT
    l.loja,
    s.semana_iso,
    COALESCE(cl.meta, msg.meta_global, 0)::numeric AS meta_semana_loja
  FROM (SELECT DISTINCT loja FROM metas_lojas_mes) l
  CROSS JOIN semanas_no_mes s
  LEFT JOIN calendario_loja cl
    ON cl.ano = $1 AND cl.semana = s.semana_iso AND cl.loja = l.loja
  LEFT JOIN metas_semanais_globais msg
    ON msg.semana_iso = s.semana_iso
),

-- realizado por vendedor/loja/semana (clip mensal)
vendas_semanais AS (
  SELECT
    v.seller_name,
    v.loja,
    c.semana::int AS semana_iso,
    SUM(v.totalvalue) AS total_vendido_semana
  FROM view_vendas_liquida v
  JOIN calendario c ON v.invoicedate::date = c.data
  WHERE EXTRACT(YEAR FROM c.data) = $1
    AND EXTRACT(MONTH FROM c.data) = $2
    AND ($3::text[] IS NULL OR v.loja = ANY($3::text[]))
    AND ($4::text[] IS NULL OR v.seller_name = ANY($4::text[]))
    AND ($5::int[]  IS NULL OR EXTRACT(DAY FROM c.data)::int = ANY($5::int[]))
    AND ($6::int[]  IS NULL OR c.semana = ANY($6::int[]))
  GROUP BY v.seller_name, v.loja, c.semana
),

-- universo de linhas do relatório (todas as combinações loja×vendedor do seu dataset)
vendedores_loja AS (
  SELECT DISTINCT loja, seller_name
  FROM invoices_saida_com_entradas
  WHERE ($3::text[] IS NULL OR loja = ANY($3::text[]))
    AND ($4::text[] IS NULL OR seller_name = ANY($4::text[]))
),

-- garante linhas loja×vendedor×semana (mesmo sem venda)
linhas_relatorio AS (
  SELECT
    vl.seller_name,
    vl.loja,
    s.semana_iso
  FROM vendedores_loja vl
  CROSS JOIN semanas_no_mes s
),

-- junta realizado (pode ser zero)
linhas_com_realizado AS (
  SELECT
    lr.seller_name,
    lr.loja,
    lr.semana_iso,
    COALESCE(vs.total_vendido_semana, 0) AS total_vendido_semana
  FROM linhas_relatorio lr
  LEFT JOIN vendas_semanais vs
    ON vs.loja = lr.loja AND vs.seller_name = lr.seller_name AND vs.semana_iso = lr.semana_iso
),

-- 🔸 qtd de vendedores no relatório por loja+semana (usado para dividir a meta da loja)
qtd_vendedores_semana AS (
  SELECT loja, semana_iso, COUNT(*)::int AS qtd
  FROM linhas_relatorio
  GROUP BY loja, semana_iso
),

-- detalhe por linha (distribui meta_semana_loja igualmente pelos vendedores do relatório)
vendas_semana_detalhe AS (
  SELECT
    lcr.seller_name,
    lcr.loja,
    lcr.semana_iso,
    lcr.total_vendido_semana,
    mll.meta_semana_loja,
    qv.qtd AS qtd_vendedores,
    ml.cota_vendedor,
    ml.super_cota,
    ml.cota_ouro,
    ml.abaixo_cota,
    -- meta do vendedor = meta_semana_loja / qtd_vendedores_da_semana
    (CASE WHEN qv.qtd > 0 THEN mll.meta_semana_loja / qv.qtd ELSE 0 END) AS meta_semana_vendedor
  FROM linhas_com_realizado lcr
  JOIN metas_semanais_loja mll
    ON mll.loja = lcr.loja AND mll.semana_iso = lcr.semana_iso
  JOIN qtd_vendedores_semana qv
    ON qv.loja = lcr.loja AND qv.semana_iso = lcr.semana_iso
  JOIN metas_lojas_mes ml
    ON ml.loja = lcr.loja
)

SELECT
  v.seller_name,
  v.loja,
  SUM(v.total_vendido_semana) AS realizado_mes,          -- soma das semanas do mês
  SUM(v.meta_semana_vendedor) AS meta_mes,               -- soma das metas (distribuídas) das semanas = meta mensal
  SUM(
    CASE 
      WHEN v.meta_semana_vendedor = 0 THEN 0
      WHEN v.total_vendido_semana < v.meta_semana_vendedor
        THEN v.total_vendido_semana * (v.abaixo_cota / 100.0)
      ELSE
        v.total_vendido_semana *
        CASE
          WHEN v.total_vendido_semana / v.meta_semana_vendedor <= 1.20 THEN v.cota_vendedor / 100.0
          WHEN v.total_vendido_semana / v.meta_semana_vendedor <= 1.40 THEN v.super_cota / 100.0
          ELSE v.cota_ouro / 100.0
        END
    END
  ) AS comissao_total_mes,
  COALESCE(
    json_agg(
      json_build_object(
        'semana',    'S' || v.semana_iso,
        'realizado', v.total_vendido_semana,
        'meta',      v.meta_semana_vendedor,
        'comissao',
          CASE 
            WHEN v.meta_semana_vendedor = 0 THEN 0
            WHEN v.total_vendido_semana < v.meta_semana_vendedor
              THEN v.total_vendido_semana * (v.abaixo_cota / 100.0)
            ELSE
              v.total_vendido_semana *
              CASE
                WHEN v.total_vendido_semana / v.meta_semana_vendedor <= 1.20 THEN v.cota_vendedor / 100.0
                WHEN v.total_vendido_semana / v.meta_semana_vendedor <= 1.40 THEN v.super_cota / 100.0
                ELSE v.cota_ouro / 100.0
              END
          END
      )
      ORDER BY v.semana_iso
    ) FILTER (WHERE v.semana_iso IS NOT NULL),
    '[]'
  ) AS detalhe_semanal
FROM vendas_semana_detalhe v
GROUP BY v.seller_name, v.loja
ORDER BY v.loja, v.seller_name;
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const now = new Date();
    const ano = parseInt(req.query.ano) || now.getFullYear();
    const mes = parseInt(req.query.mes) || now.getMonth() + 1;

    const parseCsvParam = (param) => {
      if (!param) return null;
      if (Array.isArray(param)) return param;
      return String(param)
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
    };

    const lojas       = parseCsvParam(req.query.loja);
    const vendedores  = parseCsvParam(req.query.vendedor);
    const dias        = parseCsvParam(req.query.dia)?.map((d) => parseInt(d, 10)) || null;
    const semanasISO  = parseCsvParam(req.query.semana)?.map((s) => parseInt(s, 10)) || null;

    const { rows } = await pool.query(QUERY_VENDAS_VENDEDOR_MENSAL_FILTROS, [
      ano,        // $1
      mes,        // $2
      lojas,      // $3 text[]
      vendedores, // $4 text[]
      dias,       // $5 int[]
      semanasISO, // $6 int[]
    ]);

    res.status(200).json({ data: rows, mes, ano, semanas: semanasISO });
  } catch (error) {
    console.error("Erro API relatorio_mensal_vendedor_comissao:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}
