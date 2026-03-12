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

function normalizeDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function normalizeText(v) {
  const s = String(v || "").trim();
  return s || null;
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
    const cliente_codigo = normalizeText(body.cliente_codigo);
    const nfe_id = body.nfe_id ? Number(body.nfe_id) : null;
    const fornecedor_cnpj = normalizeDigits(body.fornecedor_cnpj);
    const itens = Array.isArray(body.itens_pendentes) ? body.itens_pendentes : [];

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
    const processed = [];

    for (const rawItem of itens) {
      const cprod_origem = normalizeText(rawItem?.cprod_origem || rawItem?.cprod);
      const xprod_origem = normalizeText(rawItem?.xprod_origem || rawItem?.xprod);
      const ncm_origem = normalizeText(rawItem?.ncm_origem || rawItem?.ncm);
      const cfop_origem = normalizeText(rawItem?.cfop_origem || rawItem?.cfop);
      const tipo_item_origem = normalizeText(rawItem?.tipo_item_origem || "NFE");
      const sugestao_codigo_erp = normalizeText(rawItem?.sugestao_codigo_erp);
      const sugestao_descricao_erp = normalizeText(rawItem?.sugestao_descricao_erp);
      const n_item = rawItem?.n_item ?? null;

      if (!cprod_origem) {
        continue;
      }

      const existsRes = await client.query(
        `
        SELECT
          id,
          codigo_produto_erp,
          descricao_erp,
          status_map
        FROM public.nfe_item_erp_map
        WHERE cnpj_fornecedor = $1
          AND cprod_origem = $2
        LIMIT 1
        `,
        [fornecedor_cnpj, cprod_origem]
      );

      if (existsRes.rowCount > 0) {
        const existing = existsRes.rows[0];

        await client.query(
          `
          UPDATE public.nfe_item_erp_map
          SET
            xprod_origem = COALESCE($3, xprod_origem),
            ncm_origem = COALESCE($4, ncm_origem),
            cfop_origem = COALESCE($5, cfop_origem),
            tipo_item_origem = COALESCE($6, tipo_item_origem),
            codigo_produto_erp = COALESCE(codigo_produto_erp, $7),
            descricao_erp = COALESCE(descricao_erp, $8),
            updated_at = NOW()
          WHERE id = $1
          `,
          [
            existing.id,
            fornecedor_cnpj,
            xprod_origem,
            ncm_origem,
            cfop_origem,
            tipo_item_origem,
            sugestao_codigo_erp,
            sugestao_descricao_erp,
          ]
        );

        updated += 1;
        processed.push({
          id: existing.id,
          n_item,
          cprod_origem,
          action: "updated",
        });

        continue;
      }

      const insertRes = await client.query(
        `
        INSERT INTO public.nfe_item_erp_map
        (
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
          created_at,
          updated_at
        )
        VALUES
        (
          $1, $2, $3, $4, $5, $6,
          $7, $8,
          'PENDENTE',
          true,
          NOW(),
          NOW()
        )
        RETURNING id
        `,
        [
          fornecedor_cnpj,
          cprod_origem,
          xprod_origem,
          ncm_origem,
          cfop_origem,
          tipo_item_origem,
          sugestao_codigo_erp,
          sugestao_descricao_erp,
        ]
      );

      inserted += 1;
      processed.push({
        id: insertRes.rows[0].id,
        n_item,
        cprod_origem,
        action: "inserted",
      });
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      cliente_codigo,
      nfe_id,
      fornecedor_cnpj,
      total_recebidos: itens.length,
      inserted,
      updated,
      processed,
    });
  } catch (e) {
    await client.query("ROLLBACK");

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