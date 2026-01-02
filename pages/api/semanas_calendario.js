import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL_VENDEDORES });

const Q_TODAS = `
WITH semanas_ano AS (
  SELECT
    EXTRACT(ISOYEAR FROM c.data)::int AS isoyear,
    c.semana::int AS semana_iso,
    MIN(c.data)::date AS ini,
    MAX(c.data)::date AS fim
  FROM calendario c
  WHERE EXTRACT(ISOYEAR FROM c.data)::int = $1
  GROUP BY 1,2
)
SELECT isoyear, semana_iso, ini, fim
FROM semanas_ano
ORDER BY isoyear, semana_iso;
`;

const Q_MESES = `
WITH input AS ( SELECT $1::int AS isoyear, $2::int[] AS meses ),
dias_mes AS (
  SELECT
    c.data::date AS d,
    EXTRACT(MONTH FROM c.data)::int AS mes,
    EXTRACT(ISOYEAR FROM c.data)::int AS isoyear,
    c.semana::int AS semana_iso
  FROM calendario c
  JOIN input i ON i.isoyear = EXTRACT(ISOYEAR FROM c.data)::int
  WHERE EXTRACT(MONTH FROM c.data)::int = ANY((SELECT meses FROM input))
),
semanas_no_mes AS (
  SELECT
    isoyear,
    mes,
    semana_iso,
    MIN(d)::date AS ini,
    MAX(d)::date AS fim
  FROM dias_mes
  GROUP BY isoyear, mes, semana_iso
)
SELECT isoyear, mes, semana_iso, ini, fim
FROM semanas_no_mes
ORDER BY isoyear, mes, semana_iso;
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const parseCsv = (p) =>
      !p
        ? []
        : (Array.isArray(p) ? p : String(p).split(","))
            .map((s) => s.trim())
            .filter(Boolean);

    const now = new Date();
    // padrão: ano ISO atual (não ano civil)
    const anoParam = req.query.ano;
    const anoIso = parseInt(anoParam || String(now.getFullYear()), 10);

    const meses = parseCsv(req.query.mes).map((m) => parseInt(m, 10)).filter((n) => Number.isFinite(n));

    const fmt = (d) =>
      new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

    if (!meses.length) {
      const r = await pool.query(Q_TODAS, [anoIso]);

      const weeks = r.rows.map((w) => ({
        isoyear: w.isoyear,
        semana_iso: w.semana_iso,
        ini: w.ini,
        fim: w.fim,
        // value único por ano+semana (evita colisão quando mudar ano)
        value: `${w.isoyear}-${w.semana_iso}`,
        label: `S${String(w.semana_iso).padStart(2, "0")} ${fmt(w.ini)} a ${fmt(w.fim)}`,
      }));

      return res.status(200).json({ weeks, ano: anoIso, meses: null });
    } else {
      const r = await pool.query(Q_MESES, [anoIso, meses]);

      const weeks = r.rows.map((w) => ({
        isoyear: w.isoyear,
        mes: w.mes,
        semana_iso: w.semana_iso,
        ini: w.ini,
        fim: w.fim,
        value: `${w.isoyear}-${w.semana_iso}`,
        label: `S${String(w.semana_iso).padStart(2, "0")} ${fmt(w.ini)} a ${fmt(w.fim)}`,
      }));

      return res.status(200).json({ weeks, ano: anoIso, meses });
    }
  } catch (e) {
    console.error("Erro semanas_calendario:", e);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
