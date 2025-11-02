import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL_VENDEDORES });

const Q_TODAS = `
WITH semanas_ano AS (
  SELECT c.semana::int AS semana_iso,
         MIN(c.data)::date AS ini,
         MAX(c.data)::date AS fim
  FROM calendario c
  WHERE EXTRACT(YEAR FROM c.data) = $1
  GROUP BY c.semana
)
SELECT semana_iso, ini, fim
FROM semanas_ano
ORDER BY semana_iso;
`;

const Q_MESES = `
WITH input AS ( SELECT $1::int AS ano, $2::int[] AS meses ),
dias_mes AS (
  SELECT c.data::date AS d,
         EXTRACT(MONTH FROM c.data)::int AS mes,
         c.semana::int AS semana_iso
  FROM calendario c
  JOIN input i ON i.ano = EXTRACT(YEAR FROM c.data)
  WHERE EXTRACT(MONTH FROM c.data) = ANY((SELECT meses FROM input))
),
semanas_no_mes AS (
  SELECT mes,
         semana_iso,
         MIN(d) AS ini,
         MAX(d) AS fim
  FROM dias_mes
  GROUP BY mes, semana_iso
)
SELECT mes, semana_iso, ini, fim
FROM semanas_no_mes
ORDER BY mes, semana_iso;
`;

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

    const parseCsv = (p) =>
      !p ? null : (Array.isArray(p) ? p : String(p).split(",")).map(s=>s.trim()).filter(Boolean);

    const now = new Date();
    const ano = parseInt(req.query.ano || now.getFullYear(), 10);
    const meses = (parseCsv(req.query.mes) || []).map(m => parseInt(m,10));

    const fmt = d => new Date(d).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});

    if (!meses.length) {
      const r = await pool.query(Q_TODAS, [ano]);
      const weeks = r.rows.map(w => ({
        semana_iso: w.semana_iso,
        ini: w.ini,
        fim: w.fim,
        value: String(w.semana_iso),
        label: `S${String(w.semana_iso).padStart(2,"0")} ${fmt(w.ini)} a ${fmt(w.fim)}`
      }));
      return res.status(200).json({ weeks, ano, meses: null });
    } else {
      const r = await pool.query(Q_MESES, [ano, meses]);
      const weeks = r.rows.map(w => ({
        mes: w.mes,
        semana_iso: w.semana_iso,
        ini: w.ini,
        fim: w.fim,
        value: String(w.semana_iso),
        label: `S${String(w.semana_iso).padStart(2,"0")} ${fmt(w.ini)} a ${fmt(w.fim)}`
      }));
      return res.status(200).json({ weeks, ano, meses });
    }
  } catch (e) {
    console.error("Erro semanas_calendario:", e);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}
