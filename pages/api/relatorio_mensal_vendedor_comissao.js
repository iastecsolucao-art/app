// pages/api/relatorio_mensal_vendedor_comissao.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
  // ssl: { rejectUnauthorized: false },
});

const parseCsv = (v) =>
  !v
    ? []
    : String(v)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

export default async function handler(req, res) {
  try {
    const anos = parseCsv(req.query.ano).map((x) => parseInt(x, 10)).filter(Boolean);
    const semanasISO = parseCsv(req.query.semana).map((x) => parseInt(x, 10)).filter(Boolean);
    const lojas = parseCsv(req.query.loja);
    const vendedores = parseCsv(req.query.vendedor); // seller_name

    if (semanasISO.length === 0) {
      return res.status(200).json({ data: [], resumo_semanal: [], subtotais_loja: [], total_geral: {} });
    }

    // ===== Fórmula da comissão (por vendedor/semana) =====
    const COMISSAO_SQL = `
      CASE
        WHEN g.meta_vendedor <= 0 THEN 0.0325
        ELSE CASE
          WHEN COALESCE(v.realizado,0) <  g.meta_vendedor * 1.00 THEN 0.0325
          WHEN COALESCE(v.realizado,0) <= g.meta_vendedor * 1.20 THEN 0.0400
          WHEN COALESCE(v.realizado,0) <= g.meta_vendedor * 1.40 THEN 0.0450
          ELSE 0.0500
        END
      END
    `;

    // ===== PRINCIPAL: linhas por vendedor =====
    const MAIN_QUERY = `
      WITH sem AS (
        SELECT UNNEST($1::int[])::int AS semana
      ),
      cal AS (
        SELECT
          c.loja,
          c.semana,
          COALESCE(c.meta,0)::numeric(18,2) AS meta_semana_loja,
          c.qtd_vendedor
        FROM calendario_loja c
        JOIN sem s ON s.semana = c.semana
        WHERE ($3::text[] IS NULL OR c.loja = ANY($3::text[]))
      ),
      cal_com_qtd AS (
        SELECT
          loja,
          semana,
          meta_semana_loja,
          COALESCE(qtd_vendedor, MAX(qtd_vendedor) OVER (PARTITION BY loja)) AS qtd_vendedor_efetiva
        FROM cal
      ),
      base_vendedores AS (
        SELECT DISTINCT
          (SELECT dl.loja FROM d_loja dl WHERE dl.branch_code = vld.branch_code) AS loja,
          vld.seller_name
        FROM vw_vendas_liquidas_detalhe vld
        WHERE EXTRACT(WEEK FROM vld.data)::int = ANY($1::int[])
          AND ($2::int[] IS NULL OR EXTRACT(YEAR FROM vld.data)::int = ANY($2::int[]))
          AND ($3::text[] IS NULL OR (SELECT dl.loja FROM d_loja dl WHERE dl.branch_code = vld.branch_code) = ANY($3::text[]))
          AND ($4::text[] IS NULL OR vld.seller_name = ANY($4::text[]))
      ),
      grade AS (
        SELECT
          b.loja,
          b.seller_name,
          s.semana,
          cc.meta_semana_loja,
          GREATEST(COALESCE(cc.qtd_vendedor_efetiva,1),1)::int AS qtd_vendedor_efetiva,
          (cc.meta_semana_loja / GREATEST(COALESCE(cc.qtd_vendedor_efetiva,1),1)::numeric)::numeric(18,2) AS meta_vendedor
        FROM base_vendedores b
        CROSS JOIN sem s
        LEFT JOIN cal_com_qtd cc
               ON cc.loja = b.loja
              AND cc.semana = s.semana
        WHERE cc.loja IS NOT NULL
          AND ($3::text[] IS NULL OR b.loja = ANY($3::text[]))
          AND ($4::text[] IS NULL OR b.seller_name = ANY($4::text[]))
      ),
      vendas AS (
        SELECT
          (SELECT dl.loja FROM d_loja dl WHERE dl.branch_code = bj.branch_code) AS loja,
          bj.seller_name,
          EXTRACT(WEEK FROM bj.data)::int AS semana,
          SUM(bj.valor_liquido)::numeric(18,2) AS realizado
        FROM vw_vendas_liquidas_detalhe bj
        WHERE EXTRACT(WEEK FROM bj.data)::int = ANY($1::int[])
          AND ($2::int[] IS NULL OR EXTRACT(YEAR FROM bj.data)::int = ANY($2::int[]))
        GROUP BY 1,2,3
      ),
      linhas AS (
        SELECT
          g.loja,
          g.seller_name,
          g.semana,
          g.meta_semana_loja,
          g.qtd_vendedor_efetiva,
          g.meta_vendedor,
          COALESCE(v.realizado,0)::numeric(18,2) AS realizado,
          (${COMISSAO_SQL})::numeric(6,4) AS taxa,
          (COALESCE(v.realizado,0) * (${COMISSAO_SQL}))::numeric(18,2) AS comissao
        FROM grade g
        LEFT JOIN vendas v
               ON v.loja        = g.loja
              AND v.seller_name = g.seller_name
              AND v.semana      = g.semana
      )
      SELECT
        l.loja,
        l.seller_name,
        SUM(l.meta_vendedor)::numeric(18,2) AS total_meta,
        SUM(l.realizado)::numeric(18,2)     AS total_real,
        CASE WHEN SUM(l.meta_vendedor) > 0
             THEN (SUM(l.realizado) / SUM(l.meta_vendedor)) * 100
             ELSE 0 END::numeric(10,2)      AS pct_meta,
        SUM(l.comissao)::numeric(18,2)      AS total_comissao,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'semana',    l.semana,
            'meta',      l.meta_vendedor,
            'realizado', l.realizado,
            'comissao',  l.comissao
          )
          ORDER BY l.semana
        ) AS detalhe_semanal
      FROM linhas l
      GROUP BY l.loja, l.seller_name
      ORDER BY l.loja, l.seller_name;
    `;

    // ===== SEMANAL por loja/semana (para renderizar colunas Sxx) =====
    const RESUMO_QUERY = `
      WITH sem AS (
        SELECT UNNEST($1::int[])::int AS semana
      ),
      cal AS (
        SELECT
          c.loja,
          c.semana,
          COALESCE(c.meta,0)::numeric(18,2) AS meta_semana_loja
        FROM calendario_loja c
        JOIN sem s ON s.semana = c.semana
        WHERE ($3::text[] IS NULL OR c.loja = ANY($3::text[]))
      ),
      vendas AS (
        SELECT
          (SELECT dl.loja FROM d_loja dl WHERE dl.branch_code = bj.branch_code) AS loja,
          EXTRACT(WEEK FROM bj.data)::int AS semana,
          SUM(bj.valor_liquido)::numeric(18,2) AS realizado
        FROM vw_vendas_liquidas_detalhe bj
        WHERE EXTRACT(WEEK FROM bj.data)::int = ANY($1::int[])
          AND ($2::int[] IS NULL OR EXTRACT(YEAR FROM bj.data)::int = ANY($2::int[]))
          AND ($3::text[] IS NULL OR (SELECT dl.loja FROM d_loja dl WHERE dl.branch_code = bj.branch_code) = ANY($3::text[]))
        GROUP BY 1,2
      )
      SELECT
        c.loja,
        c.semana,
        COALESCE(c.meta_semana_loja,0)::numeric(18,2) AS meta_semana_loja,
        COALESCE(v.realizado,0)::numeric(18,2)        AS realizado_semana,
        COALESCE(c.meta_semana_loja,0)::numeric(18,2) AS total_meta_semana
      FROM cal c
      LEFT JOIN vendas v
             ON v.loja   = c.loja
            AND v.semana = c.semana
      ORDER BY c.loja, c.semana;
    `;

    // ===== SUBTOTAL agregado por loja (meta da calendar, realizado somado, comissão somando por vendedor) =====
    const SUBTOTAL_LOJA_QUERY = `
      WITH sem AS (
        SELECT UNNEST($1::int[])::int AS semana
      ),
      -- metas semanais por loja (para meta do subtotal)
      cal AS (
        SELECT
          c.loja,
          c.semana,
          COALESCE(c.meta,0)::numeric(18,2) AS meta_semana_loja
        FROM calendario_loja c
        JOIN sem s ON s.semana = c.semana
        WHERE ($3::text[] IS NULL OR c.loja = ANY($3::text[]))
      ),
      meta_agg AS (
        SELECT loja, SUM(meta_semana_loja)::numeric(18,2) AS meta_total_loja
        FROM cal
        GROUP BY loja
      ),
      -- realizado agregado (independe de qtd_vendedor)
      vendas_semana AS (
        SELECT
          (SELECT dl.loja FROM d_loja dl WHERE dl.branch_code = bj.branch_code) AS loja,
          EXTRACT(WEEK FROM bj.data)::int AS semana,
          SUM(bj.valor_liquido)::numeric(18,2) AS realizado
        FROM vw_vendas_liquidas_detalhe bj
        WHERE EXTRACT(WEEK FROM bj.data)::int = ANY($1::int[])
          AND ($2::int[] IS NULL OR EXTRACT(YEAR FROM bj.data)::int = ANY($2::int[]))
          AND ($3::text[] IS NULL OR (SELECT dl.loja FROM d_loja dl WHERE dl.branch_code = bj.branch_code) = ANY($3::text[]))
        GROUP BY 1,2
      ),
      real_agg AS (
        SELECT loja, SUM(realizado)::numeric(18,2) AS realizado_total_loja
        FROM vendas_semana
        GROUP BY loja
      ),
      -- comissão agregada: mesma regra do detalhe (por vendedor/semana), somando por loja
      -- base de vendedores conforme filtros
      base_vendedores AS (
        SELECT DISTINCT
          (SELECT dl.loja FROM d_loja dl WHERE dl.branch_code = vld.branch_code) AS loja,
          vld.seller_name
        FROM vw_vendas_liquidas_detalhe vld
        WHERE EXTRACT(WEEK FROM vld.data)::int = ANY($1::int[])
          AND ($2::int[] IS NULL OR EXTRACT(YEAR FROM vld.data)::int = ANY($2::int[]))
          AND ($3::text[] IS NULL OR (SELECT dl.loja FROM d_loja dl WHERE dl.branch_code = vld.branch_code) = ANY($3::text[]))
          AND ($4::text[] IS NULL OR vld.seller_name = ANY($4::text[]))
      ),
      grade AS (
        SELECT
          b.loja,
          b.seller_name,
          s.semana,
          c.meta_semana_loja,
          -- divide pela qtd de vendedores da loja/semana; se nulo, assume 1
          GREATEST(COALESCE(
            (SELECT COALESCE(c2.qtd_vendedor, MAX(c2.qtd_vendedor) OVER (PARTITION BY c2.loja))
             FROM calendario_loja c2
             WHERE c2.loja = b.loja AND c2.semana = s.semana), 1), 1)::int AS qtd_vendedor_efetiva,
          (c.meta_semana_loja / GREATEST(COALESCE(
            (SELECT COALESCE(c2.qtd_vendedor, MAX(c2.qtd_vendedor) OVER (PARTITION BY c2.loja))
             FROM calendario_loja c2
             WHERE c2.loja = b.loja AND c2.semana = s.semana), 1), 1)::numeric)::numeric(18,2) AS meta_vendedor
        FROM base_vendedores b
        CROSS JOIN sem s
        LEFT JOIN cal c
               ON c.loja   = b.loja
              AND c.semana = s.semana
        WHERE c.loja IS NOT NULL
      ),
      vendas_vend AS (
        SELECT
          (SELECT dl.loja FROM d_loja dl WHERE dl.branch_code = bj.branch_code) AS loja,
          bj.seller_name,
          EXTRACT(WEEK FROM bj.data)::int AS semana,
          SUM(bj.valor_liquido)::numeric(18,2) AS realizado
        FROM vw_vendas_liquidas_detalhe bj
        WHERE EXTRACT(WEEK FROM bj.data)::int = ANY($1::int[])
          AND ($2::int[] IS NULL OR EXTRACT(YEAR FROM bj.data)::int = ANY($2::int[]))
        GROUP BY 1,2,3
      ),
      linhas AS (
        SELECT
          g.loja,
          g.seller_name,
          g.semana,
          g.meta_vendedor,
          COALESCE(v.realizado,0)::numeric(18,2) AS realizado,
          (
            CASE
              WHEN g.meta_vendedor <= 0 THEN 0.0325
              ELSE CASE
                WHEN COALESCE(v.realizado,0) <  g.meta_vendedor * 1.00 THEN 0.0325
                WHEN COALESCE(v.realizado,0) <= g.meta_vendedor * 1.20 THEN 0.0400
                WHEN COALESCE(v.realizado,0) <= g.meta_vendedor * 1.40 THEN 0.0450
                ELSE 0.0500
              END
            END
          )::numeric(6,4) AS taxa,
          (COALESCE(v.realizado,0) *
            (
              CASE
                WHEN g.meta_vendedor <= 0 THEN 0.0325
                ELSE CASE
                  WHEN COALESCE(v.realizado,0) <  g.meta_vendedor * 1.00 THEN 0.0325
                  WHEN COALESCE(v.realizado,0) <= g.meta_vendedor * 1.20 THEN 0.0400
                  WHEN COALESCE(v.realizado,0) <= g.meta_vendedor * 1.40 THEN 0.0450
                  ELSE 0.0500
                END
              END
            )
          )::numeric(18,2) AS comissao
        FROM grade g
        LEFT JOIN vendas_vend v
               ON v.loja        = g.loja
              AND v.seller_name = g.seller_name
              AND v.semana      = g.semana
      ),
      com_agg AS (
        SELECT loja, SUM(comissao)::numeric(18,2) AS comissao_total_loja
        FROM linhas
        GROUP BY loja
      )
      SELECT
        x.loja,
        COALESCE(m.meta_total_loja,0)     AS meta_total_loja,
        COALESCE(r.realizado_total_loja,0) AS realizado_total_loja,
        COALESCE(c.comissao_total_loja,0)  AS comissao_total_loja,
        CASE WHEN COALESCE(m.meta_total_loja,0) > 0
             THEN (COALESCE(r.realizado_total_loja,0) / m.meta_total_loja) * 100
             ELSE 0 END::numeric(10,2)    AS pct_meta_loja
      FROM (SELECT DISTINCT loja FROM cal
            UNION SELECT DISTINCT loja FROM vendas_semana
            UNION SELECT DISTINCT loja FROM com_agg) x
      LEFT JOIN meta_agg m ON m.loja = x.loja
      LEFT JOIN real_agg r ON r.loja = x.loja
      LEFT JOIN com_agg  c ON c.loja = x.loja
      ORDER BY x.loja;
    `;

    // Parâmetros
    const paramsMain = [
      semanasISO,                                // $1::int[]
      anos.length > 0 ? anos : null,             // $2::int[]
      lojas.length > 0 ? lojas : null,           // $3::text[]
      vendedores.length > 0 ? vendedores : null, // $4::text[]
    ];

    const { rows: data } = await pool.query(MAIN_QUERY, paramsMain);

    const paramsResumo = [
      semanasISO,                                // $1::int[]
      anos.length > 0 ? anos : null,             // $2::int[]
      lojas.length > 0 ? lojas : null,           // $3::text[]
    ];
    const { rows: resumoSemanal } = await pool.query(RESUMO_QUERY, paramsResumo);

    const { rows: subtotaisLoja } = await pool.query(SUBTOTAL_LOJA_QUERY, paramsMain);

    // Total geral (somando os subtotais do banco)
    const totalGeral = subtotaisLoja.reduce(
      (acc, r) => {
        acc.meta_total    += Number(r.meta_total_loja || 0);
        acc.real_total    += Number(r.realizado_total_loja || 0);
        acc.comissao_total+= Number(r.comissao_total_loja || 0);
        return acc;
      },
      { meta_total: 0, real_total: 0, comissao_total: 0 }
    );
    totalGeral.pct_meta = totalGeral.meta_total > 0 ? Number(((totalGeral.real_total / totalGeral.meta_total) * 100).toFixed(2)) : 0;

    return res.status(200).json({
      data,                      // linhas por vendedor
      resumo_semanal: resumoSemanal, // por loja/semana (para colunas Sxx)
      subtotais_loja: subtotaisLoja, // agregado por loja (meta, real, comissão, %)
      total_geral: totalGeral,       // somatório geral
    });
  } catch (err) {
    console.error("Erro API relatorio_mensal_vendedor_comissao:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
