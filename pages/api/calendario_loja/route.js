// app/api/calendario_loja/route.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
  // descomente se seu PG exigir SSL
  // ssl: { rejectUnauthorized: false },
});

// util: transforma "1,2,3" -> [1,2,3] ou "A,B" -> ["A","B"]
function toList(val, isNumber = true) {
  if (!val) return [];
  const arr = String(val)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return isNumber ? arr.map((x) => Number(x)) : arr;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const anos    = toList(searchParams.get("ano"), true);
  const meses   = toList(searchParams.get("mes"), true);
  const semanas = toList(searchParams.get("semana"), true);
  const lojas   = toList(searchParams.get("loja"), false);

  // montagem dinâmica do WHERE com parâmetros posicionais ($1, $2, ...)
  const where = [];
  const params = [];
  let idx = 1;

  if (anos.length)   { where.push(`ano   = ANY($${idx})`); params.push(anos);   idx++; }
  if (meses.length)  { where.push(`mes   = ANY($${idx})`); params.push(meses);  idx++; }
  if (semanas.length){ where.push(`semana= ANY($${idx})`); params.push(semanas);idx++; }
  if (lojas.length)  { where.push(`loja  = ANY($${idx})`); params.push(lojas);  idx++; }

  const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // ⚠️ Ajuste os nomes das colunas conforme seu schema.
  // Aqui assumimos as colunas da sua screenshot: abaixo, cota, super_cota, cota_ouro, ano, mes, semana, loja.
  const sql = `
    SELECT
      loja,
      semana,
      ano,
      mes,
      COALESCE(abaixo,     3.25)::numeric AS abaixo,
      COALESCE(cota,       4.00)::numeric AS cota,
      COALESCE(super_cota, 4.50)::numeric AS super_cota,
      COALESCE(cota_ouro,  5.00)::numeric AS cota_ouro
    FROM calendario_loja
    ${whereSQL}
    ORDER BY loja, ano, mes, semana;
  `;

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(sql, params);
      // resposta enxuta só com o que o front precisa
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Erro /api/calendario_loja:", err);
    return new Response(JSON.stringify({ error: "Erro ao consultar calendario_loja" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
