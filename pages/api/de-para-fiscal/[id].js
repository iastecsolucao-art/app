import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida");
}

let pool = global._deParaFiscalPgPoolById;

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

  global._deParaFiscalPgPoolById = pool;
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

export default async function handler(req, res) {
  try {
    const id = toPositiveInt(firstValue(req.query.id));

    if (!id) {
      return res.status(400).json({
        error: "id inválido",
      });
    }

    if (req.method === "GET") {
      const empresa_id = toPositiveInt(firstValue(req.query.empresa_id));

      if (!empresa_id) {
        return res.status(400).json({
          error: "empresa_id é obrigatório",
        });
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
        WHERE id = $1
          AND empresa_id = $2
        LIMIT 1
      `;

      const result = await pool.query(query, [id, empresa_id]);

      if (!result.rows.length) {
        return res.status(404).json({
          error: "Registro não encontrado",
        });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === "PUT") {
      const payload = normalizeBody(req.body || {});

      if (!payload.empresa_id) {
        return res.status(400).json({
          error: "empresa_id é obrigatório",
        });
      }

      const existsQuery = `
        SELECT id
        FROM de_para_fiscal
        WHERE id = $1
          AND empresa_id = $2
        LIMIT 1
      `;

      const exists = await pool.query(existsQuery, [id, payload.empresa_id]);

      if (!exists.rows.length) {
        return res.status(404).json({
          error: "Registro não encontrado para atualização",
        });
      }

      const updateQuery = `
        UPDATE de_para_fiscal
        SET
          cfop_origem = $1,
          natureza_origem = $2,
          cst_origem = $3,
          serie_origem = $4,
          cfop_destino = $5,
          natureza_destino = $6,
          cst_destino = $7,
          especie_serie_destino = $8,
          ativo = $9,
          observacao = $10,
          updated_at = NOW()
        WHERE id = $11
          AND empresa_id = $12
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
        id,
        payload.empresa_id,
      ];

      const result = await pool.query(updateQuery, values);

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === "DELETE") {
      const empresa_id = toPositiveInt(req.body?.empresa_id);

      if (!empresa_id) {
        return res.status(400).json({
          error: "empresa_id é obrigatório",
        });
      }

      const deleteQuery = `
        DELETE FROM de_para_fiscal
        WHERE id = $1
          AND empresa_id = $2
        RETURNING id
      `;

      const result = await pool.query(deleteQuery, [id, empresa_id]);

      if (!result.rows.length) {
        return res.status(404).json({
          error: "Registro não encontrado para exclusão",
        });
      }

      return res.status(200).json({
        success: true,
        id,
      });
    }

    return res.status(405).json({
      error: "Método não permitido",
    });
  } catch (error) {
    console.error("Erro em /api/de-para-fiscal/[id]:", error);

    return res.status(500).json({
      error: "Erro interno ao processar de/para fiscal",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}