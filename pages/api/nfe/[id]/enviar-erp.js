import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._nfePgPool;

if (!pool) {
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  global._nfePgPool = pool;
}

function normalizeCnpj(v) {
  return String(v || "").replace(/\D/g, "");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const idInt = Number.parseInt(String(rawId), 10);

  if (!Number.isInteger(idInt) || idInt <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const docRes = await client.query(
      `
      SELECT
        id,
        chave_nfe,
        n_nf,
        serie,
        xnome_emit,
        cnpj_emit,
        xnome_dest,
        cnpj_dest,
        vnf,
        COALESCE(status_erp, 2) AS status_erp
      FROM public.nfe_document
      WHERE id = $1
      LIMIT 1
      `,
      [idInt]
    );

    if (!docRes.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Documento não encontrado" });
    }

    const doc = docRes.rows[0];
    const cnpjEmit = normalizeCnpj(doc.cnpj_emit);
    const pendencias = [];

    // valida fornecedor em participante
    const partRes = await client.query(
      `
      SELECT id, cnpj, xnome
      FROM public.nfe_participante
      WHERE cnpj = $1
      LIMIT 1
      `,
      [cnpjEmit]
    );

    if (!partRes.rowCount) {
      pendencias.push(
        `Fornecedor ${doc.xnome_emit || "-"} (${cnpjEmit || "-"}) não cadastrado em participantes`
      );
    }

    // valida itens no mapa ERP
    const itemRes = await client.query(
      `
      SELECT
        i.id,
        i.n_item,
        i.c_prod AS cprod,
        i.x_prod AS xprod,
        m.id AS map_id,
        m.codigo_produto_erp,
        m.ativo,
        m.status_map
      FROM public.nfe_item i
      LEFT JOIN public.nfe_item_erp_map m
        ON m.cnpj_fornecedor = $2
       AND m.cprod_origem = i.c_prod
      WHERE i.nfe_id = $1
      ORDER BY i.n_item, i.id
      `,
      [idInt, cnpjEmit]
    );

    const items = Array.isArray(itemRes.rows) ? itemRes.rows : [];

    for (const item of items) {
      const hasValidMap =
        item.map_id &&
        item.ativo === true &&
        String(item.status_map || "").toUpperCase() !== "IGNORADO" &&
        item.codigo_produto_erp;

      if (!hasValidMap) {
        pendencias.push(`Item ${item.cprod || "-"} - ${item.xprod || "-"} sem de/para ERP`);
      }
    }

    if (pendencias.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Não foi possível enviar ao ERP",
        details: "Existem pendências de de/para",
        map_pendencias: pendencias,
      });
    }

    await client.query(
      `
      INSERT INTO public.nfe_erp_queue (
        nfe_id,
        status,
        tentativas,
        created_at,
        updated_at
      )
      VALUES ($1, 'PENDENTE', 0, NOW(), NOW())
      ON CONFLICT (nfe_id)
      DO UPDATE SET
        status = 'PENDENTE',
        updated_at = NOW(),
        last_error = NULL
      `,
      [idInt]
    );

    await client.query(
      `
      UPDATE public.nfe_document
      SET status_erp = 1
      WHERE id = $1
      `,
      [idInt]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "NF enfileirada para envio ao ERP",
      nfe_id: idInt,
      chave_nfe: doc.chave_nfe,
      status_erp: 1,
    });
  } catch (e) {
    await client.query("ROLLBACK");

    console.error("Erro em POST /api/nfe/[id]/enviar-erp:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao enfileirar NF para ERP",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}