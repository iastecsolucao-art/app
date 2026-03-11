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

function checkAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  return !!API_TOKEN && token === API_TOKEN;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
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
        q.nfe_id,
        q.status,
        q.tentativas,
        q.created_at,
        q.updated_at
      FROM public.nfe_erp_queue q
      WHERE q.status = 'PENDENTE'
      ORDER BY q.created_at ASC, q.id ASC
      LIMIT 20
      FOR UPDATE SKIP LOCKED
      `
    );

    const queueRows = queueRes.rows || [];

    if (queueRows.length === 0) {
      await client.query("COMMIT");
      return res.status(200).json({ rows: [] });
    }

    const nfeIds = queueRows.map((r) => Number(r.nfe_id));
    const placeholders = nfeIds.map((_, i) => `$${i + 1}`).join(",");

    await client.query(
      `
      UPDATE public.nfe_erp_queue
      SET
        status = 'PROCESSANDO',
        reservado_em = NOW(),
        reservado_por = $1,
        updated_at = NOW()
      WHERE nfe_id = ANY($2::bigint[])
      `,
      [req.headers["x-client-name"] || "PYTHON_CLIENT", nfeIds]
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
      WHERE d.id IN (${placeholders})
      `,
      nfeIds
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
        m.codigo_erp AS codigo_produto_erp,
        m.descricao_erp
      FROM public.nfe_item i
      LEFT JOIN public.nfe_item_erp_map m
        ON m.cnpj_fornecedor = (
          SELECT d.cnpj_emit
          FROM public.nfe_document d
          WHERE d.id = i.nfe_id
        )
       AND (
            m.cprod_fornecedor = i.c_prod
            OR (m.cprod_fornecedor IS NULL AND UPPER(COALESCE(m.xprod_fornecedor, '')) = UPPER(COALESCE(i.x_prod, '')))
       )
       AND COALESCE(m.ativo, true) = true
      WHERE i.nfe_id IN (${placeholders})
      ORDER BY i.nfe_id ASC, i.n_item ASC, i.id ASC
      `,
      nfeIds
    );

    const payRes = await client.query(
      `
      SELECT
        p.nfe_id,
        p.tpag,
        p.vpag,
        p.indpag,
        p.card_cnpj,
        p.card_tband,
        p.card_tpintegra,
        p.card_caut
      FROM public.nfe_payment p
      WHERE p.nfe_id IN (${placeholders})
      ORDER BY p.nfe_id ASC, p.id ASC
      `,
      nfeIds
    );

    const partMapRes = await client.query(
      `
      SELECT
        m.participante_id,
        m.codigo_erp,
        p.cnpj,
        p.tipo
      FROM public.nfe_participante_erp_map m
      INNER JOIN public.nfe_participante p
        ON p.id = m.participante_id
      WHERE COALESCE(m.ativo, true) = true
      `
    );

    const mapByTipoCnpj = new Map();
    for (const r of partMapRes.rows || []) {
      mapByTipoCnpj.set(`${String(r.tipo || "").toUpperCase()}|${String(r.cnpj || "")}`, r);
    }

    const docsById = new Map();
    for (const d of docRes.rows || []) {
      const emitMap = mapByTipoCnpj.get(`EMITENTE|${d.cnpj_emit}`) || null;
      const destMap = mapByTipoCnpj.get(`DESTINATARIO|${d.cnpj_dest}`) || null;

      docsById.set(Number(d.nfe_id), {
        nfe_id: Number(d.nfe_id),
        chave_nfe: d.chave_nfe,
        n_nf: d.n_nf,
        serie: d.serie,
        dh_emi: d.dh_emi,
        vnf: d.vnf,
        emitente: {
          cnpj: d.cnpj_emit,
          xnome: d.xnome_emit,
          ie: d.ie_emit,
          uf: d.uf_emit,
          municipio: d.municipio_emit,
          codigo_erp: emitMap?.codigo_erp || null,
        },
        destinatario: {
          cnpj: d.cnpj_dest,
          xnome: d.xnome_dest,
          ie: d.ie_dest,
          uf: d.uf_dest,
          municipio: d.municipio_dest,
          codigo_erp: destMap?.codigo_erp || null,
        },
        itens: [],
        pagamentos: [],
      });
    }

    for (const it of itemRes.rows || []) {
      const row = docsById.get(Number(it.nfe_id));
      if (!row) continue;

      row.itens.push({
        n_item: it.n_item,
        cprod: it.cprod,
        xprod: it.xprod,
        ncm: it.ncm,
        cfop: it.cfop,
        ucom: it.ucom,
        qcom: it.qcom,
        vuncom: it.vuncom,
        vprod: it.vprod,
        codigo_produto_erp: it.codigo_produto_erp || null,
        descricao_erp: it.descricao_erp || null,
      });
    }

    for (const pg of payRes.rows || []) {
      const row = docsById.get(Number(pg.nfe_id));
      if (!row) continue;

      row.pagamentos.push({
        tpag: pg.tpag,
        vpag: pg.vpag,
        indpag: pg.indpag,
        card_cnpj: pg.card_cnpj,
        card_tband: pg.card_tband,
        card_tpintegra: pg.card_tpintegra,
        card_caut: pg.card_caut,
      });
    }

    await client.query("COMMIT");

    return res.status(200).json({
      rows: nfeIds.map((id) => docsById.get(Number(id))).filter(Boolean),
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Erro em GET /api/integracao/erp/pending:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao buscar pendências ERP",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}