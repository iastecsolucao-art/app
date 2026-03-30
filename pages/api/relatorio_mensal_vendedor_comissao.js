// pages/api/relatorio_mensal_vendedor_comissao.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
  // ssl: { rejectUnauthorized: false },
});

const ALLOWED_DATE_COLS = new Set(["invoicedate", "issuedate"]);
const sanitizeDateCol = (v) => (ALLOWED_DATE_COLS.has(v) ? v : "invoicedate");

const parseCsv = (v) =>
  !v ? [] : String(v).split(",").map((s) => s.trim()).filter(Boolean);

export default async function handler(req, res) {
  try {
    const anos = parseCsv(req.query.ano).map((x) => parseInt(x, 10)).filter(Boolean);
    const semanasISO = parseCsv(req.query.semana).map((x) => parseInt(x, 10)).filter(Boolean);
    const lojas = parseCsv(req.query.loja);
    const vendedores = parseCsv(req.query.vendedor);

    const VV_DATE_COL = sanitizeDateCol(String(req.query.datecol || "invoicedate").toLowerCase());

    if (semanasISO.length === 0) {
      return res
        .status(200)
        .json({ data: [], resumo_semanal: [], subtotais_loja: [], total_geral: {} });
    }

    // Comissão calculada conforme % atingido:
    // < 100%  -> abaixo
    // >=100%  -> cota
    // >=110%  -> super_cota
    // >=120%  -> cota_ouro
    // Os percentuais vêm do calendario_loja e são convertidos para decimal (/100)
    const COMISSAO_SQL = `
      CASE
        WHEN g.meta_vendedor <= 0 THEN (g.abaixo / 100.0)
        ELSE CASE
          WHEN (COALESCE(v.realizado,0) / NULLIF(g.meta_vendedor,0)) * 100 >= 120 THEN (g.cota_ouro / 100.0)
          WHEN (COALESCE(v.realizado,0) / NULLIF(g.meta_vendedor,0)) * 100 >= 110 THEN (g.super_cota / 100.0)
          WHEN (COALESCE(v.realizado,0) / NULLIF(g.meta_vendedor,0)) * 100 >= 100 THEN (g.cota / 100.0)
          ELSE (g.abaixo / 100.0)
        END
      END`;

    const MAIN_QUERY = `
      WITH sem AS (
        SELECT UNNEST($1::int[])::int AS semana
      ),
      dias_calendario AS (
        SELECT c.data::date, c.ano, c.semana
        FROM calendario c
        JOIN sem s ON s.semana = c.semana
        WHERE ($2::int[] IS NULL OR EXTRACT(ISOYEAR FROM c.data)::int = ANY($2::int[]))
      ),
      periodo AS (
        SELECT MIN(data)::date AS dt_ini, MAX(data)::date AS dt_fim
        FROM dias_calendario
      ),
      metas AS (
        SELECT
          cl.loja,
          cl.ano,
          cl.semana,
          COALESCE(cl.meta,0)::numeric(18,2) AS meta_semana_loja,
          GREATEST(COALESCE(cl.qtd_vendedor,1),1) AS qtd_vendedor,
          COALESCE(cl.abaixo, 3.25)::numeric(10,4) AS abaixo,
          COALESCE(cl.cota, 4.00)::numeric(10,4) AS cota,
          COALESCE(cl.super_cota, 4.50)::numeric(10,4) AS super_cota,
          COALESCE(cl.cota_ouro, 5.00)::numeric(10,4) AS cota_ouro
        FROM calendario_loja cl
        JOIN sem s ON s.semana = cl.semana
        WHERE ($2::int[] IS NULL OR cl.ano = ANY($2::int[]))
          AND ($3::text[] IS NULL OR cl.loja = ANY($3::text[]))
      ),
      base_vendedores AS (
        SELECT DISTINCT
          dl.loja,
          vd.seller_name
        FROM view_vendas_liquida vv
        JOIN periodo p ON vv.${VV_DATE_COL}::date BETWEEN p.dt_ini AND p.dt_fim
        JOIN d_loja dl           ON dl.branch_code = vv.branchcode
        LEFT JOIN vendedores vd  ON vd.seller_code = vv.dealercode::int
        WHERE ($3::text[] IS NULL OR dl.loja = ANY($3::text[]))
          AND ($4::text[] IS NULL OR vd.seller_name = ANY($4::text[]))
      ),
      grade AS (
        SELECT
          b.loja,
          b.seller_name,
          m.semana,
          m.meta_semana_loja,
          m.qtd_vendedor,
          (m.meta_semana_loja / m.qtd_vendedor)::numeric(18,2) AS meta_vendedor,
          m.abaixo,
          m.cota,
          m.super_cota,
          m.cota_ouro
        FROM base_vendedores b
        JOIN metas m ON m.loja = b.loja
      ),
      vendas AS (
        SELECT
          dl.loja AS loja,
          vd.seller_name,
          c.semana::int AS semana,
          SUM(vv.totalvalue)::numeric(18,2) AS realizado
        FROM view_vendas_liquida vv
        JOIN periodo p ON vv.${VV_DATE_COL}::date BETWEEN p.dt_ini AND p.dt_fim
        JOIN calendario c ON c.data::date = vv.${VV_DATE_COL}::date
        JOIN d_loja dl          ON dl.branch_code = vv.branchcode
        LEFT JOIN vendedores vd ON vd.seller_code = vv.dealercode::int
        WHERE c.semana = ANY($1::int[])
          AND ($2::int[] IS NULL OR EXTRACT(ISOYEAR FROM c.data)::int = ANY($2::int[]))
          AND ($3::text[] IS NULL OR dl.loja = ANY($3::text[]))
          AND ($4::text[] IS NULL OR vd.seller_name = ANY($4::text[]))
        GROUP BY 1,2,3
      ),
      linhas AS (
        SELECT
          g.loja,
          g.seller_name,
          g.semana,
          g.meta_semana_loja,
          g.qtd_vendedor,
          g.meta_vendedor,
          g.abaixo,
          g.cota,
          g.super_cota,
          g.cota_ouro,
          COALESCE(v.realizado,0)::numeric(18,2) AS realizado,
          CASE
            WHEN g.meta_vendedor > 0
              THEN ((COALESCE(v.realizado,0) / g.meta_vendedor) * 100)::numeric(18,2)
            ELSE 0::numeric(18,2)
          END AS pct_atingido,
          (${COMISSAO_SQL})::numeric(10,6) AS taxa,
          (COALESCE(v.realizado,0) * (${COMISSAO_SQL}))::numeric(18,2) AS comissao
        FROM grade g
        LEFT JOIN vendas v
          ON v.loja = g.loja
         AND v.seller_name = g.seller_name
         AND v.semana = g.semana
      )
      SELECT
        loja,
        seller_name,
        SUM(meta_vendedor)::numeric(18,2) AS total_meta,
        SUM(realizado)::numeric(18,2) AS total_real,
        CASE
          WHEN SUM(meta_vendedor) > 0
            THEN ((SUM(realizado) / SUM(meta_vendedor)) * 100)::numeric(18,2)
          ELSE 0
        END AS pct_meta,
        SUM(comissao)::numeric(18,2) AS total_comissao,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'semana', semana,
            'meta', meta_vendedor,
            'realizado', realizado,
            'comissao', comissao,
            'pct_atingido', pct_atingido,
            'taxa_comissao', taxa
          )
          ORDER BY semana
        ) AS detalhe_semanal
      FROM linhas
      GROUP BY loja, seller_name
      ORDER BY loja, seller_name;
    `;

    const RESUMO_QUERY = `
      WITH sem AS (
        SELECT UNNEST($1::int[])::int AS semana
      ),
      dias_calendario AS (
        SELECT c.data::date, c.ano, c.semana
        FROM calendario c
        JOIN sem s ON s.semana = c.semana
        WHERE ($2::int[] IS NULL OR EXTRACT(ISOYEAR FROM c.data)::int = ANY($2::int[]))
      ),
      periodo AS (
        SELECT MIN(data)::date AS dt_ini, MAX(data)::date AS dt_fim
        FROM dias_calendario
      ),
      metas AS (
        SELECT
          cl.loja,
          cl.ano,
          cl.semana,
          COALESCE(cl.meta,0)::numeric(18,2) AS meta_semana_loja
        FROM calendario_loja cl
        JOIN sem s ON s.semana = cl.semana
        WHERE ($2::int[] IS NULL OR cl.ano = ANY($2::int[]))
          AND ($3::text[] IS NULL OR cl.loja = ANY($3::text[]))
      ),
      vendas AS (
        SELECT
          dl.loja AS loja,
          c.semana::int AS semana,
          SUM(vv.totalvalue)::numeric(18,2) AS realizado
        FROM view_vendas_liquida vv
        JOIN periodo p ON vv.${VV_DATE_COL}::date BETWEEN p.dt_ini AND p.dt_fim
        JOIN calendario c ON c.data::date = vv.${VV_DATE_COL}::date
        JOIN d_loja dl ON dl.branch_code = vv.branchcode
        WHERE c.semana = ANY($1::int[])
          AND ($2::int[] IS NULL OR EXTRACT(ISOYEAR FROM c.data)::int = ANY($2::int[]))
          AND ($3::text[] IS NULL OR dl.loja = ANY($3::text[]))
        GROUP BY 1,2
      )
      SELECT
        m.loja,
        m.semana,
        COALESCE(m.meta_semana_loja,0) AS meta_semana_loja,
        COALESCE(v.realizado,0) AS realizado_semana
      FROM metas m
      LEFT JOIN vendas v
        ON v.loja = m.loja
       AND v.semana = m.semana
      ORDER BY m.loja, m.semana;
    `;

    const SUBTOTAL_LOJA_QUERY = `
      WITH sem AS (
        SELECT UNNEST($1::int[])::int AS semana
      ),
      dias_calendario AS (
        SELECT c.data::date, c.ano, c.semana
        FROM calendario c
        JOIN sem s ON s.semana = c.semana
        WHERE ($2::int[] IS NULL OR EXTRACT(ISOYEAR FROM c.data)::int = ANY($2::int[]))
      ),
      periodo AS (
        SELECT MIN(data)::date AS dt_ini, MAX(data)::date AS dt_fim
        FROM dias_calendario
      ),
      metas AS (
        SELECT
          cl.loja,
          cl.ano,
          cl.semana,
          COALESCE(cl.meta,0)::numeric(18,2) AS meta_semana_loja,
          GREATEST(COALESCE(cl.qtd_vendedor,1),1) AS qtd_vendedor,
          COALESCE(cl.abaixo, 3.25)::numeric(10,4) AS abaixo,
          COALESCE(cl.cota, 4.00)::numeric(10,4) AS cota,
          COALESCE(cl.super_cota, 4.50)::numeric(10,4) AS super_cota,
          COALESCE(cl.cota_ouro, 5.00)::numeric(10,4) AS cota_ouro
        FROM calendario_loja cl
        JOIN sem s ON s.semana = cl.semana
        WHERE ($2::int[] IS NULL OR cl.ano = ANY($2::int[]))
          AND ($3::text[] IS NULL OR cl.loja = ANY($3::text[]))
      ),
      meta_agg AS (
        SELECT
          loja,
          SUM(meta_semana_loja)::numeric(18,2) AS meta_total_loja
        FROM metas
        GROUP BY loja
      ),
      vendas_semana AS (
        SELECT
          dl.loja AS loja,
          c.semana::int AS semana,
          SUM(vv.totalvalue)::numeric(18,2) AS realizado
        FROM view_vendas_liquida vv
        JOIN periodo p ON vv.${VV_DATE_COL}::date BETWEEN p.dt_ini AND p.dt_fim
        JOIN calendario c ON c.data::date = vv.${VV_DATE_COL}::date
        JOIN d_loja dl ON dl.branch_code = vv.branchcode
        WHERE c.semana = ANY($1::int[])
          AND ($2::int[] IS NULL OR EXTRACT(ISOYEAR FROM c.data)::int = ANY($2::int[]))
          AND ($3::text[] IS NULL OR dl.loja = ANY($3::text[]))
        GROUP BY 1,2
      ),
      real_agg AS (
        SELECT
          loja,
          SUM(realizado)::numeric(18,2) AS realizado_total_loja
        FROM vendas_semana
        GROUP BY loja
      ),
      base_vendedores AS (
        SELECT DISTINCT
          dl.loja,
          vd.seller_name
        FROM view_vendas_liquida vv
        JOIN periodo p ON vv.${VV_DATE_COL}::date BETWEEN p.dt_ini AND p.dt_fim
        JOIN d_loja dl          ON dl.branch_code = vv.branchcode
        LEFT JOIN vendedores vd ON vd.seller_code = vv.dealercode::int
        WHERE ($3::text[] IS NULL OR dl.loja = ANY($3::text[]))
          AND ($4::text[] IS NULL OR vd.seller_name = ANY($4::text[]))
      ),
      grade AS (
        SELECT
          b.loja,
          b.seller_name,
          m.semana,
          m.meta_semana_loja,
          m.qtd_vendedor,
          (m.meta_semana_loja / m.qtd_vendedor)::numeric(18,2) AS meta_vendedor,
          m.abaixo,
          m.cota,
          m.super_cota,
          m.cota_ouro
        FROM base_vendedores b
        JOIN metas m ON m.loja = b.loja
      ),
      vendas_vend AS (
        SELECT
          dl.loja AS loja,
          vd.seller_name,
          c.semana::int AS semana,
          SUM(vv.totalvalue)::numeric(18,2) AS realizado
        FROM view_vendas_liquida vv
        JOIN periodo p ON vv.${VV_DATE_COL}::date BETWEEN p.dt_ini AND p.dt_fim
        JOIN calendario c ON c.data::date = vv.${VV_DATE_COL}::date
        JOIN d_loja dl          ON dl.branch_code = vv.branchcode
        LEFT JOIN vendedores vd ON vd.seller_code = vv.dealercode::int
        WHERE c.semana = ANY($1::int[])
          AND ($2::int[] IS NULL OR EXTRACT(ISOYEAR FROM c.data)::int = ANY($2::int[]))
          AND ($3::text[] IS NULL OR dl.loja = ANY($3::text[]))
          AND ($4::text[] IS NULL OR vd.seller_name = ANY($4::text[]))
        GROUP BY 1,2,3
      ),
      linhas AS (
        SELECT
          g.loja,
          g.seller_name,
          g.semana,
          g.meta_vendedor,
          g.abaixo,
          g.cota,
          g.super_cota,
          g.cota_ouro,
          COALESCE(v.realizado,0)::numeric(18,2) AS realizado,
          CASE
            WHEN g.meta_vendedor > 0
              THEN ((COALESCE(v.realizado,0) / g.meta_vendedor) * 100)::numeric(18,2)
            ELSE 0::numeric(18,2)
          END AS pct_atingido,
          (${COMISSAO_SQL})::numeric(10,6) AS taxa,
          (COALESCE(v.realizado,0) * (${COMISSAO_SQL}))::numeric(18,2) AS comissao
        FROM grade g
        LEFT JOIN vendas_vend v
          ON v.loja = g.loja
         AND v.seller_name = g.seller_name
         AND v.semana = g.semana
      ),
      com_agg AS (
        SELECT
          loja,
          SUM(comissao)::numeric(18,2) AS comissao_total_loja
        FROM linhas
        GROUP BY loja
      )
      SELECT
        x.loja,
        COALESCE(m.meta_total_loja,0) AS meta_total_loja,
        COALESCE(r.realizado_total_loja,0) AS realizado_total_loja,
        COALESCE(c.comissao_total_loja,0) AS comissao_total_loja,
        CASE
          WHEN COALESCE(m.meta_total_loja,0) > 0
            THEN ((COALESCE(r.realizado_total_loja,0) / m.meta_total_loja) * 100)::numeric(18,2)
          ELSE 0
        END AS pct_meta_loja
      FROM (SELECT DISTINCT loja FROM metas) x
      LEFT JOIN meta_agg m ON m.loja = x.loja
      LEFT JOIN real_agg r ON r.loja = x.loja
      LEFT JOIN com_agg c ON c.loja = x.loja
      ORDER BY x.loja;
    `;

    const paramsMain = [
      semanasISO,
      anos.length ? anos : null,
      lojas.length ? lojas : null,
      vendedores.length ? vendedores : null,
    ];

    const { rows: data } = await pool.query(MAIN_QUERY, paramsMain);

    const paramsResumo = [
      semanasISO,
      anos.length ? anos : null,
      lojas.length ? lojas : null,
    ];
    const { rows: resumo_semanal } = await pool.query(RESUMO_QUERY, paramsResumo);

    const { rows: subtotais_loja } = await pool.query(SUBTOTAL_LOJA_QUERY, paramsMain);

    const total_geral = subtotais_loja.reduce(
      (acc, r) => {
        acc.meta_total += Number(r.meta_total_loja || 0);
        acc.real_total += Number(r.realizado_total_loja || 0);
        acc.comissao_total += Number(r.comissao_total_loja || 0);
        return acc;
      },
      { meta_total: 0, real_total: 0, comissao_total: 0 }
    );

    total_geral.pct_meta =
      total_geral.meta_total > 0
        ? Number(((total_geral.real_total / total_geral.meta_total) * 100).toFixed(2))
        : 0;

    return res.status(200).json({
      data,
      resumo_semanal,
      subtotais_loja,
      total_geral,
      datecol: VV_DATE_COL,
    });
  } catch (err) {
    console.error("Erro API relatorio_mensal_vendedor_comissao:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}