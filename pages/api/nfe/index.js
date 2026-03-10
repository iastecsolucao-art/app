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

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
}

function normalizeBody(body = {}) {
  return {
    tipo: String(body.tipo || "").trim().toUpperCase(),
    cnpj: String(body.cnpj || "").replace(/\D/g, ""),
    xnome: String(body.xnome || "").trim(),
    ie: body.ie ? String(body.ie).trim() : null,
    uf: body.uf ? String(body.uf).trim().toUpperCase() : null,
    municipio: body.municipio ? String(body.municipio).trim() : null,
    xlgr: body.xlgr ? String(body.xlgr).trim() : null,
    nro: body.nro ? String(body.nro).trim() : null,
    xcpl: body.xcpl ? String(body.xcpl).trim() : null,
    xbair: body.xbair ? String(body.xbair).trim() : null,
    cmun: body.cmun ? String(body.cmun).trim() : null,
    cep: body.cep ? String(body.cep).replace(/\D/g, "") : null,
    cpais: body.cpais ? String(body.cpais).trim() : null,
    xpais: body.xpais ? String(body.xpais).trim() : null,
    fone: body.fone ? String(body.fone).replace(/\D/g, "") : null,
  };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const q = String(firstValue(req.query.q) || "").trim();
      const tipo = String(firstValue(req.query.tipo) || "").trim().toUpperCase();
      const uf = String(firstValue(req.query.uf) || "").trim().toUpperCase();

      const rawLimit = firstValue(req.query.limit);
      const limit = Math.min(
        Math.max(parseInt(String(rawLimit || "50"), 10) || 50, 1),
        200
      );

      const params = [];
      const where = [];

      if (q) {
        params.push(`%${q}%`);
        const p = `$${params.length}`;

        where.push(`(
          cnpj ILIKE ${p}
          OR xnome ILIKE ${p}
          OR COALESCE(ie, '') ILIKE ${p}
          OR COALESCE(municipio, '') ILIKE ${p}
          OR COALESCE(xlgr, '') ILIKE ${p}
          OR COALESCE(nro, '') ILIKE ${p}
          OR COALESCE(xcpl, '') ILIKE ${p}
          OR COALESCE(xbair, '') ILIKE ${p}
          OR COALESCE(cmun, '') ILIKE ${p}
          OR COALESCE(cep, '') ILIKE ${p}
          OR COALESCE(cpais, '') ILIKE ${p}
          OR COALESCE(xpais, '') ILIKE ${p}
          OR COALESCE(fone, '') ILIKE ${p}
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
        params.push(uf);
        where.push(`uf = $${params.length}`);
      }

      params.push(limit);
      const limitParam = `$${params.length}`;

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
          xlgr,
          nro,
          xcpl,
          xbair,
          cmun,
          cep,
          cpais,
          xpais,
          fone,
          created_at,
          updated_at
        FROM public.nfe_participante
        ${whereSql}
        ORDER BY xnome ASC, id DESC
        LIMIT ${limitParam}
        `,
        params
      );

      return res.status(200).json({
        rows: Array.isArray(result.rows) ? result.rows : [],
      });
    } catch (e) {
      console.error("Erro em GET /api/participantes:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        table: e?.table,
      });

      return res.status(500).json({
        error: "Erro ao listar participantes",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "POST") {
    try {
      const data = normalizeBody(req.body);

      if (!["EMITENTE", "DESTINATARIO"].includes(data.tipo)) {
        return res.status(400).json({ error: "Tipo inválido" });
      }

      if (!data.cnpj || data.cnpj.length !== 14) {
        return res.status(400).json({ error: "CNPJ inválido" });
      }

      if (!data.xnome) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      const result = await pool.query(
        `
        INSERT INTO public.nfe_participante (
          tipo,
          cnpj,
          xnome,
          ie,
          uf,
          municipio,
          xlgr,
          nro,
          xcpl,
          xbair,
          cmun,
          cep,
          cpais,
          xpais,
          fone
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING
          id,
          tipo,
          cnpj,
          xnome,
          ie,
          uf,
          municipio,
          xlgr,
          nro,
          xcpl,
          xbair,
          cmun,
          cep,
          cpais,
          xpais,
          fone,
          created_at,
          updated_at
        `,
        [
          data.tipo,
          data.cnpj,
          data.xnome,
          data.ie,
          data.uf,
          data.municipio,
          data.xlgr,
          data.nro,
          data.xcpl,
          data.xbair,
          data.cmun,
          data.cep,
          data.cpais,
          data.xpais,
          data.fone,
        ]
      );

      return res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error("Erro em POST /api/participantes:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        table: e?.table,
      });

      if (e?.code === "23505") {
        return res.status(409).json({
          error: "Já existe um participante com esse tipo e CNPJ",
          details: e?.detail || e?.message,
        });
      }

      return res.status(500).json({
        error: "Erro ao cadastrar participante",
        details: e?.message || String(e),
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({
    error: `Método ${req.method} não permitido`,
  });
}