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

function normalizeBody(body = {}) {
  return {
    participante_id: body.participante_id ? Number(body.participante_id) : null,
    sistema_destino: String(body.sistema_destino || "ERP").trim(),
    cnpj_fornecedor: body.cnpj_fornecedor ? String(body.cnpj_fornecedor).replace(/\D/g, "") : null,
    cprod_origem: body.cprod_origem ? String(body.cprod_origem).trim() : null,
    xprod_origem: body.xprod_origem ? String(body.xprod_origem).trim() : null,
    ncm_origem: body.ncm_origem ? String(body.ncm_origem).trim() : null,
    cfop_origem: body.cfop_origem ? String(body.cfop_origem).trim() : null,
    unidade_origem: body.unidade_origem ? String(body.unidade_origem).trim() : null,
    codigo_produto_erp: body.codigo_produto_erp ? String(body.codigo_produto_erp).trim() : null,
    sku_erp: body.sku_erp ? String(body.sku_erp).trim() : null,
    descricao_erp: body.descricao_erp ? String(body.descricao_erp).trim() : null,
    unidade_erp: body.unidade_erp ? String(body.unidade_erp).trim() : null,
    ncm_erp: body.ncm_erp ? String(body.ncm_erp).trim() : null,
    ativo: body.ativo === undefined ? true : !!body.ativo,
    observacao: body.observacao ? String(body.observacao).trim() : null,
    status_map: String(body.status_map || "PENDENTE").trim().toUpperCase(),
  };
}

const STATUS_VALIDOS = ["PENDENTE", "MAPEADO", "ENVIADO", "ERRO", "IGNORADO"];

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
        FROM public.nfe_item_erp_map
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "Mapeamento de item não encontrado" });
      }

      return res.status(200).json(result.rows[0]);
    } catch (e) {
      console.error("Erro em GET /api/item-erp-map/[id]:", e);
      return res.status(500).json({
        error: "Erro ao buscar mapeamento de item",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "PUT") {
    try {
      const data = normalizeBody(req.body);

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

      const result = await pool.query(
        `
        UPDATE public.nfe_item_erp_map
        SET
          participante_id = $1,
          sistema_destino = $2,
          cnpj_fornecedor = $3,
          cprod_origem = $4,
          xprod_origem = $5,
          ncm_origem = $6,
          cfop_origem = $7,
          unidade_origem = $8,
          codigo_produto_erp = $9,
          sku_erp = $10,
          descricao_erp = $11,
          unidade_erp = $12,
          ncm_erp = $13,
          ativo = $14,
          observacao = $15,
          status_map = $16,
          updated_at = NOW()
        WHERE id = $17
        RETURNING *
        `,
        [
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
          id,
        ]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "Mapeamento de item não encontrado" });
      }

      return res.status(200).json(result.rows[0]);
    } catch (e) {
      console.error("Erro em PUT /api/item-erp-map/[id]:", e);

      if (e?.code === "23505") {
        return res.status(409).json({
          error: "Já existe um mapeamento para esse fornecedor/código origem/sistema",
          details: e?.detail || e?.message,
        });
      }

      return res.status(500).json({
        error: "Erro ao atualizar mapeamento de item",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const result = await pool.query(
        `
        DELETE FROM public.nfe_item_erp_map
        WHERE id = $1
        RETURNING id
        `,
        [id]
      );

      if (!result.rowCount) {
        return res.status(404).json({ error: "Mapeamento de item não encontrado" });
      }

      return res.status(200).json({ success: true });
    } catch (e) {
      console.error("Erro em DELETE /api/item-erp-map/[id]:", e);
      return res.status(500).json({
        error: "Erro ao excluir mapeamento de item",
        details: e?.message || String(e),
      });
    }
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}