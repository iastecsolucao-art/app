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

function normalizeDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function normalizeText(v) {
  const s = String(v || "").trim();
  return s || null;
}

function normalizeCode(v) {
  const s = String(v || "").trim();
  return s || null;
}

function toNullableNumber(v) {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  const client = await pool.connect();

  try {
    const body = req.body || {};

    const empresa_id = toNullableNumber(body.empresa_id);
    const cliente_codigo = normalizeText(body.cliente_codigo);
    const nfe_id = toNullableNumber(body.nfe_id);
    const fornecedor_cnpj = normalizeDigits(body.fornecedor_cnpj);
    const itens = Array.isArray(body.itens_pendentes) ? body.itens_pendentes : [];

    if (!empresa_id || empresa_id <= 0) {
      return res.status(400).json({ error: "empresa_id é obrigatório" });
    }

    if (!cliente_codigo) {
      return res.status(400).json({ error: "cliente_codigo é obrigatório" });
    }

    if (!fornecedor_cnpj) {
      return res.status(400).json({ error: "fornecedor_cnpj é obrigatório" });
    }

    if (itens.length === 0) {
      return res.status(400).json({ error: "itens_pendentes é obrigatório" });
    }

    await client.query("BEGIN");

    let inserted = 0;
    let updated = 0;
    let ignored = 0;
    const processed = [];

    for (const rawItem of itens) {
      const cprod_origem = normalizeCode(rawItem?.cprod_origem || rawItem?.cprod);
      const xprod_origem = normalizeText(rawItem?.xprod_origem || rawItem?.xprod);
      const ncm_origem = normalizeText(rawItem?.ncm_origem || rawItem?.ncm);
      const cfop_origem = normalizeText(rawItem?.cfop_origem || rawItem?.cfop);
      const tipo_item_origem = normalizeText(rawItem?.tipo_item_origem || "NFE");
      const sugestao_codigo_erp = normalizeText(rawItem?.sugestao_codigo_erp);
      const sugestao_descricao_erp = normalizeText(rawItem?.sugestao_descricao_erp);
      const n_item = rawItem?.n_item ?? null;
      const chave_nfe = normalizeText(rawItem?.chave_nfe || body?.chave_nfe);
      const pedido_origem = normalizeText(rawItem?.pedido_origem || body?.pedido_origem);

      if (!cprod_origem) {
        ignored += 1;
        processed.push({
          n_item,
          action: "ignored",
          reason: "cprod_origem vazio",
        });
        continue;
      }

      const existsRes = await client.query(
        `
        SELECT
          id,
          codigo_produto_erp,
          descricao_erp,
          status_map,
          xprod_origem,
          ncm_origem,
          cfop_origem,
          tipo_item_origem
        FROM public.nfe_item_erp_map
        WHERE empresa_id = $1
          AND cnpj_fornecedor = $2
          AND cprod_origem = $3
          AND COALESCE(sistema_destino, 'ERP') = 'ERP'
        ORDER BY id DESC
        LIMIT 1
        `,
        [empresa_id, fornecedor_cnpj, cprod_origem]
      );

      if (existsRes.rowCount > 0) {
        const existing = existsRes.rows[0];

        await client.query(
          `
          UPDATE public.nfe_item_erp_map
          SET
            xprod_origem = COALESCE(public.nfe_item_erp_map.xprod_origem, $2),
            ncm_origem = COALESCE(public.nfe_item_erp_map.ncm_origem, $3),
            cfop_origem = COALESCE(public.nfe_item_erp_map.cfop_origem, $4),
            tipo_item_origem = COALESCE(public.nfe_item_erp_map.tipo_item_origem, $5),

            codigo_produto_erp = CASE
              WHEN public.nfe_item_erp_map.codigo_produto_erp IS NULL
                   OR TRIM(public.nfe_item_erp_map.codigo_produto_erp) = ''
              THEN $6
              ELSE public.nfe_item_erp_map.codigo_produto_erp
            END,

            descricao_erp = CASE
              WHEN public.nfe_item_erp_map.descricao_erp IS NULL
                   OR TRIM(public.nfe_item_erp_map.descricao_erp) = ''
              THEN $7
              ELSE public.nfe_item_erp_map.descricao_erp
            END,

            nfe_id = COALESCE(public.nfe_item_erp_map.nfe_id, $8),
            chave_nfe = COALESCE(public.nfe_item_erp_map.chave_nfe, $9),
            pedido_origem = COALESCE(public.nfe_item_erp_map.pedido_origem, $10),
            n_item = COALESCE(public.nfe_item_erp_map.n_item, $11),
            origem_aplicacao = COALESCE(public.nfe_item_erp_map.origem_aplicacao, $12),

            updated_at = NOW()
          WHERE id = $1
          `,
          [
            existing.id,
            xprod_origem,
            ncm_origem,
            cfop_origem,
            tipo_item_origem,
            sugestao_codigo_erp,
            sugestao_descricao_erp,
            nfe_id,
            chave_nfe,
            pedido_origem,
            n_item != null ? String(n_item) : null,
            "INTEGRADOR",
          ]
        );

        updated += 1;
        processed.push({
          id: existing.id,
          n_item,
          cprod_origem,
          action: "updated",
          status_map: existing.status_map,
          codigo_produto_erp_atual: existing.codigo_produto_erp,
        });

        continue;
      }

      const insertRes = await client.query(
        `
        INSERT INTO public.nfe_item_erp_map
        (
          empresa_id,
          participante_id,
          sistema_destino,
          cnpj_fornecedor,
          cprod_origem,
          xprod_origem,
          ncm_origem,
          cfop_origem,
          tipo_item_origem,
          codigo_produto_erp,
          descricao_erp,
          status_map,
          ativo,
          nfe_id,
          chave_nfe,
          pedido_origem,
          n_item,
          origem_aplicacao,
          map_aplicado_automaticamente,
          created_at,
          updated_at
        )
        VALUES
        (
          $1,
          NULL,
          'ERP',
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          'PENDENTE',
          true,
          $10,
          $11,
          $12,
          $13,
          $14,
          false,
          NOW(),
          NOW()
        )
        RETURNING id
        `,
        [
          empresa_id,
          fornecedor_cnpj,
          cprod_origem,
          xprod_origem,
          ncm_origem,
          cfop_origem,
          tipo_item_origem,
          sugestao_codigo_erp,
          sugestao_descricao_erp,
          nfe_id,
          chave_nfe,
          pedido_origem,
          n_item != null ? String(n_item) : null,
          "INTEGRADOR",
        ]
      );

      inserted += 1;
      processed.push({
        id: insertRes.rows[0].id,
        n_item,
        cprod_origem,
        action: "inserted",
        status_map: "PENDENTE",
      });
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      empresa_id,
      cliente_codigo,
      nfe_id,
      fornecedor_cnpj,
      total_recebidos: itens.length,
      inserted,
      updated,
      ignored,
      processed,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Erro em POST /api/nfe/item-map/pending:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro interno ao gravar pendências de item ERP map",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}