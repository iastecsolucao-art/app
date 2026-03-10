import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;
const API_TOKEN = process.env.ERP_INTEGRACAO_TOKEN || "";

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

function checkAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return API_TOKEN && token === API_TOKEN;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: "Não autorizado" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const queueRes = await client.query(
      `
      SELECT
        q.id,
        q.nfe_id
      FROM public.nfe_erp_queue q
      WHERE q.status IN ('PENDENTE', 'ERRO')
      ORDER BY q.updated_at ASC, q.id ASC
      LIMIT 10
      FOR UPDATE SKIP LOCKED
      `
    );

    const queueRows = Array.isArray(queueRes.rows) ? queueRes.rows : [];

    if (queueRows.length === 0) {
      await client.query("COMMIT");
      return res.status(200).json({ rows: [] });
    }

    const nfeIds = queueRows.map((r) => r.nfe_id);

    await client.query(
      `
      UPDATE public.nfe_erp_queue
      SET
        status = 'PROCESSANDO',
        reservado_em = NOW(),
        reservado_por = $2,
        tentativas = tentativas + 1,
        updated_at = NOW()
      WHERE nfe_id = ANY($1::bigint[])
      `,
      [nfeIds, "python-integrador"]
    );

    const docRes = await client.query(
      `
      SELECT
        d.id AS nfe_id,
        d.chave_nfe,
        d.n_nf,
        d.serie,
        d.dh_emi,
        d.vnf,
        d.cnpj_emit,
        d.xnome_emit,
        d.ie_emit,
        d.uf_emit,
        d.municipio_emit,
        d.cnpj_dest,
        d.xnome_dest,
        d.ie_dest,
        d.uf_dest,
        d.municipio_dest
      FROM public.nfe_document d
      WHERE d.id = ANY($1::bigint[])
      ORDER BY d.id
      `,
      [nfeIds]
    );

    const itemRes = await client.query(
      `
      SELECT
        i.nfe_id,
        i.n_item,
        i.c_prod AS cprod,
        i.x_prod AS xprod,
        i.ncm,
        i.cfop,
        i.u_com AS ucom,
        i.q_com AS qcom,
        i.v_un_com AS vuncom,
        i.v_prod AS vprod,
        m.codigo_produto_erp,
        m.sku_erp,
        m.descricao_erp,
        m.unidade_erp,
        m.ncm_erp
      FROM public.nfe_item i
      INNER JOIN public.nfe_document d
        ON d.id = i.nfe_id
      LEFT JOIN public.nfe_item_erp_map m
        ON m.cnpj_fornecedor = d.cnpj_emit
       AND m.cprod_origem = i.c_prod
      WHERE i.nfe_id = ANY($1::bigint[])
      ORDER BY i.nfe_id, i.n_item, i.id
      `,
      [nfeIds]
    );

    const payRes = await client.query(
      `
      SELECT
        nfe_id,
        tpag,
        vpag,
        indpag,
        card_cnpj,
        card_tband,
        card_tpintegra,
        card_caut
      FROM public.nfe_payment
      WHERE nfe_id = ANY($1::bigint[])
      ORDER BY nfe_id, id
      `,
      [nfeIds]
    );

    const docs = Array.isArray(docRes.rows) ? docRes.rows : [];
    const items = Array.isArray(itemRes.rows) ? itemRes.rows : [];
    const payments = Array.isArray(payRes.rows) ? payRes.rows : [];

    const itemsByNfe = new Map();
    const paysByNfe = new Map();

    for (const item of items) {
      if (!itemsByNfe.has(item.nfe_id)) itemsByNfe.set(item.nfe_id, []);
      itemsByNfe.get(item.nfe_id).push(item);
    }

    for (const pay of payments) {
      if (!paysByNfe.has(pay.nfe_id)) paysByNfe.set(pay.nfe_id, []);
      paysByNfe.get(pay.nfe_id).push(pay);
    }

    const rows = docs.map((doc) => ({
      nfe_id: doc.nfe_id,
      chave_nfe: doc.chave_nfe,
      n_nf: doc.n_nf,
      serie: doc.serie,
      dh_emi: doc.dh_emi,
      vnf: doc.vnf,
      emitente: {
        cnpj: doc.cnpj_emit,
        xnome: doc.xnome_emit,
        ie: doc.ie_emit,
        uf: doc.uf_emit,
        municipio: doc.municipio_emit,
      },
      destinatario: {
        cnpj: doc.cnpj_dest,
        xnome: doc.xnome_dest,
        ie: doc.ie_dest,
        uf: doc.uf_dest,
        municipio: doc.municipio_dest,
      },
      itens: itemsByNfe.get(doc.nfe_id) || [],
      pagamentos: paysByNfe.get(doc.nfe_id) || [],
    }));

    await client.query("COMMIT");

    return res.status(200).json({ rows });
  } catch (e) {
    await client.query("ROLLBACK");

    console.error("Erro em GET /api/integracao/erp/pending:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao buscar fila pendente do ERP",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}