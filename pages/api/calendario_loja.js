// pages/api/calendario_loja.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
  // ssl: { rejectUnauthorized: false },
});

function toList(val, isNumber = true) {
  if (!val) return [];
  const arr = String(val).split(",").map((x) => x.trim()).filter(Boolean);

  if (!isNumber) return arr;

  // aceita "1" e também "S1 29/12 a 04/01" (pega o primeiro número)
  return arr
    .map((x) => {
      const m = String(x).match(/\d+/);
      return m ? Number(m[0]) : NaN;
    })
    .filter((n) => Number.isFinite(n));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ano, mes, semana, loja } = req.query;

  const anos = toList(ano, true);
  const meses = toList(mes, true);
  const semanas = toList(semana, true);
  const lojas = toList(loja, false);

  const where = [];
  const params = [];
  let idx = 1;

  let sql;

  if (meses.length) {
    /**
     * VERSÃO COM "MÊS":
     * - NÃO junte por cal.ano + cal.semana (pode quebrar em semana ISO na virada do ano)
     * - Use o calendário pela data:
     *   - semana ISO: cal.semana
     *   - ano ISO: EXTRACT(ISOYEAR FROM cal.data)
     */
    if (anos.length) {
      where.push(`EXTRACT(ISOYEAR FROM cal.data)::int = ANY($${idx}::int[])`);
      params.push(anos);
      idx++;
    }
    if (semanas.length) {
      where.push(`cal.semana = ANY($${idx}::int[])`);
      params.push(semanas);
      idx++;
    }
    if (lojas.length) {
      where.push(`cl.loja = ANY($${idx}::text[])`);
      params.push(lojas);
      idx++;
    }

    // filtro por mês vem do calendário
    where.push(`cal.mes = ANY($${idx}::int[])`);
    params.push(meses);
    idx++;

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    /**
     * DISTINCT ON para evitar duplicar por ter várias datas no mesmo (loja, ano iso, mes, semana)
     * Pegamos a "primeira" data da semana para representar o mês.
     */
    sql = `
      SELECT DISTINCT ON (cl.loja, EXTRACT(ISOYEAR FROM cal.data)::int, cal.mes, cal.semana)
        cl.loja,
        cal.semana,
        EXTRACT(ISOYEAR FROM cal.data)::int AS ano,
        cal.mes,
        COALESCE(cl.abaixo,     3.25)::numeric AS abaixo,
        COALESCE(cl.cota,       4.00)::numeric AS cota,
        COALESCE(cl.super_cota, 4.50)::numeric AS super_cota,
        COALESCE(cl.cota_ouro,  5.00)::numeric AS cota_ouro
      FROM calendario_loja cl
      JOIN calendario cal
        ON cal.semana = cl.semana
       AND EXTRACT(ISOYEAR FROM cal.data)::int = cl.ano
      ${whereSQL}
      ORDER BY cl.loja, EXTRACT(ISOYEAR FROM cal.data)::int, cal.mes, cal.semana, cal.data;
    `;
  } else {
    /**
     * VERSÃO SEM "MÊS":
     * Aqui você depende de cl.ano + cl.semana.
     * IMPORTANTE: cl.ano precisa ser o ANO ISO (não ano civil).
     */
    if (anos.length) {
      where.push(`ano = ANY($${idx}::int[])`);
      params.push(anos);
      idx++;
    }
    if (semanas.length) {
      where.push(`semana = ANY($${idx}::int[])`);
      params.push(semanas);
      idx++;
    }
    if (lojas.length) {
      where.push(`loja = ANY($${idx}::text[])`);
      params.push(lojas);
      idx++;
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    sql = `
      SELECT
        loja,
        semana,
        ano,
        NULL::int AS mes,
        COALESCE(abaixo,     3.25)::numeric AS abaixo,
        COALESCE(cota,       4.00)::numeric AS cota,
        COALESCE(super_cota, 4.50)::numeric AS super_cota,
        COALESCE(cota_ouro,  5.00)::numeric AS cota_ouro
      FROM calendario_loja
      ${whereSQL}
      ORDER BY loja, ano, semana;
    `;
  }

  try {
    const { rows } = await pool.query(sql, params);
    return res.status(200).json(rows);
  } catch (err) {
    console.error("Erro /api/calendario_loja:", err);
    return res.status(500).json({ error: "Erro ao consultar calendario_loja" });
  }
}
