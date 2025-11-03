// pages/api/calendario_loja.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
  // ssl: { rejectUnauthorized: false },
});

function toList(val, isNumber = true) {
  if (!val) return [];
  const arr = String(val).split(",").map((x) => x.trim()).filter(Boolean);
  return isNumber ? arr.map((x) => Number(x)) : arr;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { ano, mes, semana, loja } = req.query;

  const anos    = toList(ano, true);
  const meses   = toList(mes, true);        // <- pode vir vazio (sem JOIN)
  const semanas = toList(semana, true);
  const lojas   = toList(loja, false);

  // WHERE dinâmico e parâmetros
  const where = [];
  const params = [];
  let idx = 1;

  // vamos montar dois SQLs: com JOIN (se houver 'mes') e sem JOIN (default)
  let sql;

  if (meses.length) {
    // ---------- VERSÃO COM JOIN NA TABELA calendario ----------
    // Ajuste os nomes abaixo se sua tabela 'calendario' tiver outros campos.
    // Assume: calendario (ano INT, mes INT, semana INT)
    if (anos.length)    { where.push(`cl.ano    = ANY($${idx})`); params.push(anos);    idx++; }
    if (semanas.length) { where.push(`cl.semana = ANY($${idx})`); params.push(semanas); idx++; }
    if (lojas.length)   { where.push(`cl.loja   = ANY($${idx})`); params.push(lojas);   idx++; }
    // filtro por mês vem da tabela calendario
    where.push(`cal.mes = ANY($${idx})`); params.push(meses); idx++;

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    sql = `
      SELECT
        cl.loja,
        cl.semana,
        cl.ano,
        cal.mes,                                   -- <- vem do calendário
        COALESCE(cl.abaixo,     3.25)::numeric AS abaixo,
        COALESCE(cl.cota,       4.00)::numeric AS cota,
        COALESCE(cl.super_cota, 4.50)::numeric AS super_cota,
        COALESCE(cl.cota_ouro,  5.00)::numeric AS cota_ouro
      FROM calendario_loja cl
      JOIN calendario cal
        ON cal.ano = cl.ano
       AND cal.semana = cl.semana
      ${whereSQL}
      ORDER BY cl.loja, cl.ano, cal.mes, cl.semana;
    `;
  } else {
    // ---------- VERSÃO SEM JOIN (padrão) ----------
    if (anos.length)    { where.push(`ano    = ANY($${idx})`); params.push(anos);    idx++; }
    if (semanas.length) { where.push(`semana = ANY($${idx})`); params.push(semanas); idx++; }
    if (lojas.length)   { where.push(`loja   = ANY($${idx})`); params.push(lojas);   idx++; }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    sql = `
      SELECT
        loja,
        semana,
        ano,
        NULL::int AS mes,                           -- placeholder p/ manter a mesma resposta
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
    const client = await pool.connect();
    try {
      const { rows } = await client.query(sql, params);
      res.status(200).json(rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Erro /api/calendario_loja:", err);
    res.status(500).json({ error: "Erro ao consultar calendario_loja" });
  }
}
