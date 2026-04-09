import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida");
}

let pool = global._deParaFiscalPgPool;

if (!pool) {
  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  global._deParaFiscalPgPool = pool;
}

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
}

function toPositiveInt(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function cleanText(value, maxLength = null) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return maxLength ? text.slice(0, maxLength) : text;
}

function normalizeBody(body = {}) {
  return {
    empresa_id: toPositiveInt(body.empresa_id),
    cfop_origem: cleanText(body.cfop_origem, 10),
    natureza_origem: cleanText(body.natureza_origem, 255),
    cst_origem: cleanText(body.cst_origem, 10),
    serie_origem: cleanText(body.serie_origem, 20),
    cfop_destino: cleanText(body.cfop_destino, 10),
    natureza_destino: cleanText(body.natureza_destino, 255),
    cst_destino: cleanText(body.cst_destino, 10),
    especie_serie_destino: cleanText(body.especie_serie_destino, 50),
    ativo:
      typeof body.ativo === "boolean"
        ? body.ativo
        : String(body.ativo).toLowerCase() === "true",
    observacao: cleanText(body.observacao),
  };
}

function buildSearchConditions({ q, cfop_origem, cfop_destino }) {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(`(
      CAST(id AS TEXT) ILIKE $${paramIndex}
      OR COALESCE(cfop_origem, '') ILIKE $${paramIndex}
      OR COALESCE(natureza_origem, '') ILIKE $${paramIndex}
      OR COALESCE(cst_origem, '') ILIKE $${paramIndex}
      OR COALESCE(serie_origem, '') ILIKE $${paramIndex}
      OR COALESCE(cfop_destino, '') ILIKE $${paramIndex}
      OR COALESCE(natureza_destino, '') ILIKE $${paramIndex}
      OR COALESCE(cst_destino, '') ILIKE $${paramIndex}
      OR COALESCE(especie_serie_destino, '') ILIKE $${paramIndex}
      OR COALESCE(observacao, '') ILIKE $${paramIndex}
    )`);
    values.push(`%${q}%`);
    paramIndex += 1;
  }

  if (cfop_origem) {
    conditions.push(`COALESCE(cfop_origem, '') ILIKE $${paramIndex}`);
    values.push(`%${cfop_origem}%`);
    paramIndex += 1;
  }

  if (cfop_destino) {
    conditions.push(`COALESCE(cfop_destino, '') ILIKE $${paramIndex}`);
    values.push(`%${cfop_destino}%`);
    paramIndex += 1;
  }

  return { conditions, values, paramIndex };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const empresa_id = toPositiveInt(firstValue(req.query.empresa_id));
      const q = cleanText(firstValue(req.query.q));
      const cfop_origem = cleanText(firstValue(req.query.cfop_origem), 10);
      const cfop_destino = cleanText(firstValue(req.query.cfop_destino), 10);

      if (!empresa_id) {
        return res.status(400).json({
          error: "empresa_id é obrigatório",
        });
      }

      const { conditions, values, paramIndex } = buildSearchConditions({
        q,
        cfop_origem,
        cfop_destino,
      });

      const where = [`empresa_id = $${paramIndex}`];
      const finalValues = [...values, empresa_id];

      if (conditions.length) {
        where.push(...conditions);
      }

      const query = `
        SELECT
          id,
          empresa_id,
          cfop_origem,
          natureza_origem,
          cst_origem,
          serie_origem,
          cfop_destino,
          natureza_destino,
          cst_destino,
          especie_serie_destino,
          ativo,
          observacao,
          created_at,
          updated_at
        FROM de_para_fiscal
        WHERE ${where.join(" AND ")}
        ORDER BY id DESC
      `;

      const result = await pool.query(query, finalValues);

      return res.status(200).json({
        rows: result.rows,
      });
    }

    if (req.method === "POST") {
      const payload = normalizeBody(req.body || {});

      if (!payload.empresa_id) {
        return res.status(400).json({
          error: "empresa_id é obrigatório",
        });
      }

      const insertQuery = `
        INSERT INTO de_para_fiscal (
          empresa_id,
          cfop_origem,
          natureza_origem,
          cst_origem,
          serie_origem,
          cfop_destino,
          natureza_destino,
          cst_destino,
          especie_serie_destino,
          ativo,
          observacao
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11
        )
        RETURNING
          id,
          empresa_id,
          cfop_origem,
          natureza_origem,
          cst_origem,
          serie_origem,
          cfop_destino,
          natureza_destino,
          cst_destino,
          especie_serie_destino,
          ativo,
          observacao,
          created_at,
          updated_at
      `;

      const values = [
        payload.empresa_id,
        payload.cfop_origem,
        payload.natureza_origem,
        payload.cst_origem,
        payload.serie_origem,
        payload.cfop_destino,
        payload.natureza_destino,
        payload.cst_destino,
        payload.especie_serie_destino,
        payload.ativo,
        payload.observacao,
      ];

      const result = await pool.query(insertQuery, values);

      return res.status(201).json(result.rows[0]);
    }

    return res.status(405).json({
      error: "Método não permitido",
    });
  } catch (error) {
    console.error("Erro em /api/de-para-fiscal:", error);

    return res.status(500).json({
      error: "Erro interno ao processar de/para fiscal",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}