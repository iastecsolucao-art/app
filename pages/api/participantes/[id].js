import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

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
  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const id = Number.parseInt(String(rawId), 10);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  if (req.method === "GET") {
    try {
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
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "Participante não encontrado" });
      }

      return res.status(200).json(result.rows[0]);
    } catch (e) {
      console.error("Erro em GET /api/participantes/[id]:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        table: e?.table,
      });

      return res.status(500).json({
        error: "Erro ao buscar participante",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "PUT") {
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
        UPDATE public.nfe_participante
        SET
          tipo = $1,
          cnpj = $2,
          xnome = $3,
          ie = $4,
          uf = $5,
          municipio = $6,
          xlgr = $7,
          nro = $8,
          xcpl = $9,
          xbair = $10,
          cmun = $11,
          cep = $12,
          cpais = $13,
          xpais = $14,
          fone = $15,
          updated_at = NOW()
        WHERE id = $16
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
          id,
        ]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "Participante não encontrado" });
      }

      return res.status(200).json(result.rows[0]);
    } catch (e) {
      console.error("Erro em PUT /api/participantes/[id]:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        table: e?.table,
      });

      return res.status(500).json({
        error: "Erro ao atualizar participante",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const result = await pool.query(
        `
        DELETE FROM public.nfe_participante
        WHERE id = $1
        RETURNING id
        `,
        [id]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "Participante não encontrado" });
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      console.error("Erro em DELETE /api/participantes/[id]:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        table: e?.table,
      });

      return res.status(500).json({
        error: "Erro ao excluir participante",
        details: e?.message || String(e),
      });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}