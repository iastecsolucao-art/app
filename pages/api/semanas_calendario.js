// /pages/api/semanas_calendario.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

/*
  Tabela calendario esperada:
    ano   int
    semana int           -- semana (ex.: ISO week do ano)
    data  date UNIQUE    -- uma linha por dia

  Estratégia:
    - Calcula wk_start (segunda) e wk_end (domingo) a partir de cada 'data';
    - Agrupa por (ano, semana) e tira MIN/MAX dos intervalos => início/fim completos;
    - Mantém apenas semanas cujo intervalo toca algum dos meses solicitados (interseção mês);
    - Retorna array [{ ano, semana, inicio, fim, value, label }].
*/
const QUERY_SEMANAS = `
WITH input AS (
  SELECT
    $1::int         AS ano,
    COALESCE($2::int[], NULL) AS meses
),
base AS (
  SELECT
    c.ano,
    c.semana,
    c.data::date AS d,
    -- segunda-feira da semana
    (c.data::date - (EXTRACT(ISODOW FROM c.data)::int - 1))::date AS wk_start,
    -- domingo da semana
    (c.data::date - (EXTRACT(ISODOW FROM c.data)::int - 1) + 6)::date AS wk_end,
    EXTRACT(MONTH FROM c.data)::int AS mes_do_dia
  FROM calendario c
  JOIN input i ON c.ano = i.ano
),
agrup AS (
  SELECT
    ano,
    semana,
    MIN(wk_start) AS inicio_semana,
    MAX(wk_end)   AS fim_semana,
    ARRAY_AGG(DISTINCT mes_do_dia) AS meses_abrangidos
  FROM base
  GROUP BY ano, semana
),
filtrado AS (
  SELECT a.*
  FROM agrup a
  JOIN input i ON TRUE
  WHERE i.meses IS NULL
     OR EXISTS (
          SELECT 1
          FROM UNNEST(a.meses_abrangidos) m
          WHERE m = ANY(i.meses)
        )
)
SELECT
  ano,
  semana,
  inicio_semana AS inicio,
  fim_semana    AS fim
FROM filtrado
ORDER BY inicio;
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

    const parseCsv = (p) =>
      !p
        ? null
        : (Array.isArray(p) ? p : String(p).split(","))
            .map((s) => s.trim())
            .filter(Boolean);

    const now = new Date();
    const ano = parseInt(String(req.query.ano)) || now.getFullYear();

    const mesesParam = parseCsv(req.query.mes);
    const meses =
      mesesParam && mesesParam.length
        ? mesesParam.map((m) => parseInt(m, 10))
        : [now.getMonth() + 1]; // padrão: mês atual

    // dias não é necessário para o seletor; se quiser, pode incluir depois

    const { rows } = await pool.query(QUERY_SEMANAS, [ano, meses]);

    const fmtBR = (iso) =>
      new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    const weeks = rows.map((x) => ({
      ano: x.ano,
      semana: x.semana,
      inicio: x.inicio, // 'YYYY-MM-DD'
      fim: x.fim,       // 'YYYY-MM-DD'
      value: String(x.semana),
      label: `S${x.semana} ${fmtBR(x.inicio)} a ${fmtBR(x.fim)}`,
    }));

    // retorna ARRAY direto para facilitar o front
    res.status(200).json(weeks);
  } catch (e) {
    console.error("Erro semanas_calendario:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}
