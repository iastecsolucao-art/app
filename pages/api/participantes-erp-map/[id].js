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
    participante_id: body.participante_id ? Number(body.participante_id) : null,
    sistema_destino: String(body.sistema_destino || "ERP").trim(),
    codigo_erp: body.codigo_erp ? String(body.codigo_erp).trim() : null,
    cnpj_erp: body.cnpj_erp ? String(body.cnpj_erp).replace(/\D/g, "") : null,
    nome_erp: body.nome_erp ? String(body.nome_erp).trim() : null,
    ie_erp: body.ie_erp ? String(body.ie_erp).trim() : null,
    uf_erp: body.uf_erp ? String(body.uf_erp).trim().toUpperCase() : null,
    municipio_erp: body.municipio_erp ? String(body.municipio_erp).trim() : null,
    xlgr_erp: body.xlgr_erp ? String(body.xlgr_erp).trim() : null,
    nro_erp: body.nro_erp ? String(body.nro_erp).trim() : null,
    xcpl_erp: body.xcpl_erp ? String(body.xcpl_erp).trim() : null,
    xbair_erp: body.xbair_erp ? String(body.xbair_erp).trim() : null,
    cmun_erp: body.cmun_erp ? String(body.cmun_erp).trim() : null,
    cep_erp: body.cep_erp ? String(body.cep_erp).replace(/\D/g, "") : null,
    cpais_erp: body.cpais_erp ? String(body.cpais_erp).trim() : null,
    xpais_erp: body.xpais_erp ? String(body.xpais_erp).trim() : null,
    fone_erp: body.fone_erp ? String(body.fone_erp).replace(/\D/g, "") : null,
    email_erp: body.email_erp ? String(body.email_erp).trim() : null,
    observacao: body.observacao ? String(body.observacao).trim() : null,
    ativo: body.ativo === undefined ? true : !!body.ativo,
    status_envio: String(body.status_envio || "PENDENTE").trim().toUpperCase(),
  };
}

const STATUS_VALIDOS = [
  "PENDENTE",
  "MAPEADO",
  "ENVIANDO",
  "ENVIADO",
  "ERRO",
  "IGNORADO",
];

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
          m.id,
          m.participante_id,
          m.sistema_destino,
          m.tipo,
          m.cnpj_origem,
          m.nome_origem,

          p.ie AS ie_origem,
          p.uf AS uf_origem,
          p.municipio AS municipio_origem,
          p.xlgr AS xlgr_origem,
          p.nro AS nro_origem,
          p.xcpl AS xcpl_origem,
          p.xbair AS xbair_origem,
          p.cmun AS cmun_origem,
          p.cep AS cep_origem,
          p.cpais AS cpais_origem,
          p.xpais AS xpais_origem,
          p.fone AS fone_origem,

          m.codigo_erp,
          m.cnpj_erp,
          m.nome_erp,
          m.ie_erp,
          m.uf_erp,
          m.municipio_erp,
          m.xlgr_erp,
          m.nro_erp,
          m.xcpl_erp,
          m.xbair_erp,
          m.cmun_erp,
          m.cep_erp,
          m.cpais_erp,
          m.xpais_erp,
          m.fone_erp,
          m.email_erp,
          m.ativo,
          m.observacao,
          m.status_envio,
          m.ultimo_envio_em,
          m.ultimo_retorno,
          m.created_at,
          m.updated_at
        FROM public.nfe_participante_erp_map m
        LEFT JOIN public.nfe_participante p
          ON p.id = m.participante_id
        WHERE m.id = $1
        LIMIT 1
        `,
        [id]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "De/Para ERP não encontrado" });
      }

      return res.status(200).json(result.rows[0]);
    } catch (e) {
      console.error("Erro em GET /api/participantes-erp-map/[id]:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        table: e?.table,
      });

      return res.status(500).json({
        error: "Erro ao buscar de/para ERP",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "PUT") {
    try {
      const data = normalizeBody(req.body);

      if (!Number.isInteger(data.participante_id) || data.participante_id <= 0) {
        return res.status(400).json({ error: "participante_id inválido" });
      }

      if (!data.sistema_destino) {
        return res.status(400).json({ error: "sistema_destino é obrigatório" });
      }

      if (!STATUS_VALIDOS.includes(data.status_envio)) {
        return res.status(400).json({ error: "status_envio inválido" });
      }

      const partRes = await pool.query(
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
          fone
        FROM public.nfe_participante
        WHERE id = $1
        LIMIT 1
        `,
        [data.participante_id]
      );

      if (!partRes.rowCount) {
        return res.status(404).json({ error: "Participante não encontrado" });
      }

      const p = partRes.rows[0];

      const result = await pool.query(
        `
        UPDATE public.nfe_participante_erp_map
        SET
          participante_id = $1,
          sistema_destino = $2,
          tipo = $3,
          cnpj_origem = $4,
          nome_origem = $5,
          codigo_erp = $6,
          cnpj_erp = $7,
          nome_erp = $8,
          ie_erp = $9,
          uf_erp = $10,
          municipio_erp = $11,
          xlgr_erp = $12,
          nro_erp = $13,
          xcpl_erp = $14,
          xbair_erp = $15,
          cmun_erp = $16,
          cep_erp = $17,
          cpais_erp = $18,
          xpais_erp = $19,
          fone_erp = $20,
          email_erp = $21,
          ativo = $22,
          observacao = $23,
          status_envio = $24,
          updated_at = NOW()
        WHERE id = $25
        RETURNING *
        `,
        [
          data.participante_id,
          data.sistema_destino,
          p.tipo,
          p.cnpj,
          p.xnome,
          data.codigo_erp,
          data.cnpj_erp,
          data.nome_erp,
          data.ie_erp,
          data.uf_erp,
          data.municipio_erp,
          data.xlgr_erp,
          data.nro_erp,
          data.xcpl_erp,
          data.xbair_erp,
          data.cmun_erp,
          data.cep_erp,
          data.cpais_erp,
          data.xpais_erp,
          data.fone_erp,
          data.email_erp,
          data.ativo,
          data.observacao,
          data.status_envio,
          id,
        ]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "De/Para ERP não encontrado" });
      }

      const updated = result.rows[0];

      return res.status(200).json({
        ...updated,
        ie_origem: p.ie,
        uf_origem: p.uf,
        municipio_origem: p.municipio,
        xlgr_origem: p.xlgr,
        nro_origem: p.nro,
        xcpl_origem: p.xcpl,
        xbair_origem: p.xbair,
        cmun_origem: p.cmun,
        cep_origem: p.cep,
        cpais_origem: p.cpais,
        xpais_origem: p.xpais,
        fone_origem: p.fone,
      });
    } catch (e) {
      console.error("Erro em PUT /api/participantes-erp-map/[id]:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        table: e?.table,
      });

      if (e?.code === "23505") {
        return res.status(409).json({
          error: "Já existe um de/para para esse participante e sistema",
          details: e?.detail || e?.message,
        });
      }

      return res.status(500).json({
        error: "Erro ao atualizar de/para ERP",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const result = await pool.query(
        `
        DELETE FROM public.nfe_participante_erp_map
        WHERE id = $1
        RETURNING id
        `,
        [id]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "De/Para ERP não encontrado" });
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      console.error("Erro em DELETE /api/participantes-erp-map/[id]:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        table: e?.table,
      });

      return res.status(500).json({
        error: "Erro ao excluir de/para ERP",
        details: e?.message || String(e),
      });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({
    error: `Método ${req.method} não permitido`,
  });
}