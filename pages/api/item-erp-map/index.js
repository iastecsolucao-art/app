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

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
}

function toPositiveInt(value) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizeNullableText(value) {
  const s = String(value ?? "").trim();
  return s || null;
}

function normalizeBody(body = {}) {
  return {
    empresa_id: toPositiveInt(body.empresa_id),
    participante_id: toPositiveInt(body.participante_id),
    sistema_destino: String(body.sistema_destino || "ERP").trim(),
    cnpj_fornecedor: body.cnpj_fornecedor
      ? String(body.cnpj_fornecedor).replace(/\D/g, "")
      : null,
    cprod_origem: normalizeNullableText(body.cprod_origem),
    xprod_origem: normalizeNullableText(body.xprod_origem),
    ncm_origem: normalizeNullableText(body.ncm_origem),
    cfop_origem: normalizeNullableText(body.cfop_origem),
    unidade_origem: normalizeNullableText(body.unidade_origem),
    codigo_produto_erp: normalizeNullableText(body.codigo_produto_erp),
    sku_erp: normalizeNullableText(body.sku_erp),
    descricao_erp: normalizeNullableText(body.descricao_erp),
    unidade_erp: normalizeNullableText(body.unidade_erp),
    ncm_erp: normalizeNullableText(body.ncm_erp),
    ativo: body.ativo === undefined ? true : !!body.ativo,
    observacao: normalizeNullableText(body.observacao),
    status_map: String(body.status_map || "PENDENTE").trim().toUpperCase(),
  };
}

const STATUS_VALIDOS = ["PENDENTE", "MAPEADO", "ENVIADO", "ERRO", "IGNORADO"];

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const empresa_id = toPositiveInt(firstValue(req.query.empresa_id));
      const q = String(firstValue(req.query.q) || "").trim();
      const cnpj_fornecedor = String(firstValue(req.query.cnpj_fornecedor) || "").replace(/\D/g, "");
      const status_map = String(firstValue(req.query.status_map) || "").trim().toUpperCase();

      const rawLimit = firstValue(req.query.limit);
      const limit = Math.min(
        Math.max(parseInt(String(rawLimit || "50"), 10) || 50, 1),
        200
      );

      if (!empresa_id) {
        return res.status(400).json({ error: "empresa_id é obrigatório" });
      }

      const params = [];
      const where = [];

      params.push(empresa_id);
      where.push(`m.empresa_id = $${params.length}`);

      if (q) {
        params.push(`%${q}%`);
        const p = `$${params.length}`;
        where.push(`(
          COALESCE(m.cprod_origem, '') ILIKE ${p}
          OR COALESCE(m.xprod_origem, '') ILIKE ${p}
          OR COALESCE(m.codigo_produto_erp, '') ILIKE ${p}
          OR COALESCE(m.descricao_erp, '') ILIKE ${p}
          OR COALESCE(m.sku_erp, '') ILIKE ${p}
        )`);
      }

      if (cnpj_fornecedor) {
        params.push(cnpj_fornecedor);
        where.push(`m.cnpj_fornecedor = $${params.length}`);
      }

      if (status_map) {
        if (!STATUS_VALIDOS.includes(status_map)) {
          return res.status(400).json({ error: "status_map inválido" });
        }
        params.push(status_map);
        where.push(`m.status_map = $${params.length}`);
      }

      params.push(limit);
      const limitParam = `$${params.length}`;
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const result = await pool.query(
        `
        SELECT
          m.id,
          m.empresa_id,
          m.participante_id,
          m.sistema_destino,
          m.cnpj_fornecedor,
          m.cprod_origem,
          m.xprod_origem,
          m.ncm_origem,
          m.cfop_origem,
          m.unidade_origem,
          m.codigo_produto_erp,
          m.sku_erp,
          m.descricao_erp,
          m.unidade_erp,
          m.ncm_erp,
          m.ativo,
          m.observacao,
          m.status_map,
          m.created_at,
          m.updated_at
        FROM public.nfe_item_erp_map m
        ${whereSql}
        ORDER BY m.updated_at DESC, m.id DESC
        LIMIT ${limitParam}
        `,
        params
      );

      return res.status(200).json({
        rows: result.rows || [],
      });
    } catch (e) {
      console.error("Erro em GET /api/item-erp-map:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
      });

      return res.status(500).json({
        error: "Erro ao listar mapeamento de itens",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "POST") {
    const client = await pool.connect();

    try {
      const data = normalizeBody(req.body);

      if (!data.empresa_id) {
        return res.status(400).json({ error: "empresa_id é obrigatório" });
      }

      if (!data.sistema_destino) {
        return res.status(400).json({ error: "sistema_destino é obrigatório" });
      }

      if (!data.cnpj_fornecedor || data.cnpj_fornecedor.length !== 14) {
        return res.status(400).json({ error: "cnpj_fornecedor inválido" });
      }

      if (!data.cprod_origem) {
        return res.status(400).json({ error: "cprod_origem é obrigatório" });
      }

      if (!STATUS_VALIDOS.includes(data.status_map)) {
        return res.status(400).json({ error: "status_map inválido" });
      }

      await client.query("BEGIN");

      if (data.participante_id) {
        const participanteRes = await client.query(
          `
          SELECT id
          FROM public.nfe_participante
          WHERE id = $1
            AND empresa_id = $2
          LIMIT 1
          `,
          [data.participante_id, data.empresa_id]
        );

        if (!participanteRes.rowCount) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: "participante_id inválido para esta empresa",
          });
        }
      }

      const result = await client.query(
        `
        INSERT INTO public.nfe_item_erp_map (
          empresa_id,
          participante_id,
          sistema_destino,
          cnpj_fornecedor,
          cprod_origem,
          xprod_origem,
          ncm_origem,
          cfop_origem,
          unidade_origem,
          codigo_produto_erp,
          sku_erp,
          descricao_erp,
          unidade_erp,
          ncm_erp,
          ativo,
          observacao,
          status_map,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW()
        )
        RETURNING *
        `,
        [
          data.empresa_id,
          data.participante_id,
          data.sistema_destino,
          data.cnpj_fornecedor,
          data.cprod_origem,
          data.xprod_origem,
          data.ncm_origem,
          data.cfop_origem,
          data.unidade_origem,
          data.codigo_produto_erp,
          data.sku_erp,
          data.descricao_erp,
          data.unidade_erp,
          data.ncm_erp,
          data.ativo,
          data.observacao,
          data.status_map,
        ]
      );

      await client.query("COMMIT");

      return res.status(201).json(result.rows[0]);
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}

      console.error("Erro em POST /api/item-erp-map:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
      });

      if (e?.code === "23505") {
        return res.status(409).json({
          error: "Já existe um mapeamento para essa empresa/fornecedor/código origem/sistema",
          details: e?.detail || e?.message,
        });
      }

      return res.status(500).json({
        error: "Erro ao cadastrar mapeamento de item",
        details: e?.message || String(e),
      });
    } finally {
      client.release();
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({
    error: `Método ${req.method} não permitido`,
  });
}