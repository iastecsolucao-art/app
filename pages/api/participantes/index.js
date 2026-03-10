import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._nfePgPool;

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

  global._nfePgPool = pool;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const q = String(req.query.q || "").trim();
      const tipo = String(req.query.tipo || "").trim();
      const uf = String(req.query.uf || "").trim();
      const limit = Math.min(Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1), 200);

      const params = [];
      const where = [];

      if (q) {
        params.push(`%${q}%`);
        where.push(`(
          cnpj ILIKE $${params.length}
          OR xnome ILIKE $${params.length}
          OR COALESCE(ie, '') ILIKE $${params.length}
          OR COALESCE(municipio, '') ILIKE $${params.length}
        )`);
      }

      if (tipo) {
        if (!["EMITENTE", "DESTINATARIO"].includes(tipo)) {
          return res.status(400).json({ error: "tipo inválido" });
        }
        params.push(tipo);
        where.push(`tipo = $${params.length}`);
      }

      if (uf) {
        params.push(uf.toUpperCase());
        where.push(`uf = $${params.length}`);
      }

      params.push(limit);

      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const result = await pool.query(
        `
        SELECT
          id,
          tipo,
          cnpj,
          xnome,
          ie,
          uf,
          municipio,
          created_at,
          updated_at
        FROM nfe_participante
        ${whereSql}
        ORDER BY xnome ASC, id DESC
        LIMIT $${params.length}
        `,
        params
      );

      return res.status(200).json({ rows: result.rows });
    } catch (e) {
      return res.status(500).json({
        error: "Erro ao listar participantes",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      const tipo = String(body.tipo || "").trim().toUpperCase();
      const cnpj = String(body.cnpj || "").replace(/\D/g, "");
      const xnome = String(body.xnome || "").trim();
      const ie = body.ie ? String(body.ie).trim() : null;
      const uf = body.uf ? String(body.uf).trim().toUpperCase() : null;
      const municipio = body.municipio ? String(body.municipio).trim() : null;

      if (!["EMITENTE", "DESTINATARIO"].includes(tipo)) {
        return res.status(400).json({ error: "Tipo inválido" });
      }

      if (!cnpj || cnpj.length !== 14) {
        return res.status(400).json({ error: "CNPJ inválido" });
      }

      if (!xnome) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      const result = await pool.query(
        `
        INSERT INTO nfe_participante (
          tipo, cnpj, xnome, ie, uf, municipio
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [tipo, cnpj, xnome, ie, uf, municipio]
      );

      return res.status(201).json(result.rows[0]);
    } catch (e) {
      return res.status(500).json({
        error: "Erro ao cadastrar participante",
        details: e?.message || String(e),
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}