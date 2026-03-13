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

function normalizeDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function normalizeText(v) {
  const s = String(v || "").trim();
  return s || null;
}

function extractPedidoFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const normalized = raw.replace(/\s+/g, " ").toUpperCase();

  const patterns = [
    /\bPEDIDO\s+DE\s+COMPRA\s*[:\-]?\s*(\d{4,10})\b/i,
    /\bPEDIDO\(S\)\s*[:\-]?\s*(\d{4,10})\b/i,
    /\bN[ÚU]MERO\s+DO\s+PEDIDO\s*[:\-]?\s*(\d{4,10})\b/i,
    /\bPEDIDO\s+IB\s*[:\-]?\s*(\d{4,10})\b/i,
    /\bPEDIDO\s*[:\-]?\s*(\d{4,10})\b/i,
    /\bPEDIDO\s+(\d{4,10})\b/i,
    /\bP\.?EDIDO\s*[:\-]?\s*(\d{4,10})\b/i,
    /\bPED\.\s*(\d{4,10})\b/i,
    /\bPED\s*[:\-]?\s*(\d{4,10})\b/i,
    /\bPED\s+(\d{4,10})\b/i,
    /\bPC\s*[:\-]?\s*(\d{4,10})\b/i,
    /\bPED\.?\s*N\.?\s*[:\-]?\s*(\d{4,10})\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/^0+/, "") || match[1];
    }
  }

  return null;
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
        d.municipio_dest,
        d.infcpl,
        d.infadfisco,
        d.obscont_xtexto
      FROM public.nfe_document d
      WHERE d.id = ANY($1::bigint[])
      `,
      [nfeIds]
    );

    const itemRes = await client.query(
      `
      WITH docs AS (
        SELECT
          d.id,
          regexp_replace(COALESCE(d.cnpj_emit, ''), '\\D', '', 'g') AS cnpj_emit_digits
        FROM public.nfe_document d
        WHERE d.id = ANY($1::bigint[])
      ),
      item_map_ranked AS (
        SELECT
          i.nfe_id,
          i.n_item,
          i.id AS item_row_id,
          i.c_prod AS cprod,
          i.x_prod AS xprod,
          i.ncm,
          i.cfop,
          i.u_com AS ucom,
          i.q_com AS qcom,
          i.v_un_com AS vuncom,
          i.v_prod AS vprod,
          m.id AS map_id,
          m.codigo_produto_erp,
          m.descricao_erp,
          m.status_map,
          ROW_NUMBER() OVER (
            PARTITION BY i.id
            ORDER BY
              CASE
                WHEN COALESCE(NULLIF(TRIM(m.codigo_produto_erp), ''), NULL) IS NOT NULL
                 AND COALESCE(m.status_map, 'PENDENTE') = 'OK' THEN 1
                WHEN COALESCE(NULLIF(TRIM(m.codigo_produto_erp), ''), NULL) IS NOT NULL THEN 2
                ELSE 99
              END,
              m.id DESC
          ) AS rn
        FROM public.nfe_item i
        INNER JOIN docs d
          ON d.id = i.nfe_id
        LEFT JOIN public.nfe_item_erp_map m
          ON regexp_replace(COALESCE(m.cnpj_fornecedor, ''), '\\D', '', 'g') = d.cnpj_emit_digits
         AND COALESCE(m.ativo, true) = true
         AND (
              m.cprod_origem = i.c_prod
              OR (
                COALESCE(NULLIF(TRIM(m.cprod_origem), ''), NULL) IS NULL
                AND UPPER(COALESCE(m.xprod_origem, '')) = UPPER(COALESCE(i.x_prod, ''))
                AND (
                  m.ncm_origem IS NULL
                  OR m.ncm_origem = i.ncm
                )
              )
         )
      )
      SELECT
        nfe_id,
        n_item,
        cprod,
        xprod,
        ncm,
        cfop,
        ucom,
        qcom,
        vuncom,
        vprod,
        CASE
          WHEN COALESCE(NULLIF(TRIM(codigo_produto_erp), ''), NULL) IS NOT NULL
            THEN codigo_produto_erp
          ELSE NULL
        END AS codigo_produto_erp,
        descricao_erp,
        status_map
      FROM item_map_ranked
      WHERE rn = 1
      ORDER BY nfe_id ASC, n_item ASC, item_row_id ASC
      `,
      [nfeIds]
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
      WHERE p.nfe_id = ANY($1::bigint[])
      ORDER BY p.nfe_id ASC, p.id ASC
      `,
      [nfeIds]
    );

    const partMapRes = await client.query(
      `
      SELECT
        m.participante_id,
        m.codigo_erp,
        regexp_replace(COALESCE(p.cnpj, ''), '\\D', '', 'g') AS cnpj_digits,
        p.tipo
      FROM public.nfe_participante_erp_map m
      INNER JOIN public.nfe_participante p
        ON p.id = m.participante_id
      WHERE COALESCE(m.ativo, true) = true
      `
    );

    const mapByTipoCnpj = new Map();
    for (const r of partMapRes.rows || []) {
      mapByTipoCnpj.set(
        `${String(r.tipo || "").toUpperCase()}|${String(r.cnpj_digits || "")}`,
        r
      );
    }

    const docsById = new Map();

    for (const d of docRes.rows || []) {
      const emitDigits = normalizeDigits(d.cnpj_emit);
      const destDigits = normalizeDigits(d.cnpj_dest);

      const emitMap = mapByTipoCnpj.get(`EMITENTE|${emitDigits}`) || null;
      const destMap = mapByTipoCnpj.get(`DESTINATARIO|${destDigits}`) || null;

      const origem_texto =
        normalizeText(d.obscont_xtexto) ||
        normalizeText(d.infcpl) ||
        normalizeText(d.infadfisco) ||
        null;

      const pedido_relacionado = extractPedidoFromText(origem_texto);

      docsById.set(Number(d.nfe_id), {
        nfe_id: Number(d.nfe_id),
        chave_nfe: d.chave_nfe,
        n_nf: d.n_nf,
        serie: d.serie,
        dh_emi: d.dh_emi,
        vnf: d.vnf,
        infcpl: d.infcpl || null,
        infadfisco: d.infadfisco || null,
        origem_texto,
        pedido_relacionado,
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
        status_map: it.status_map || null,
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