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

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
}

function normalizeCnpj(v) {
  return String(v || "").replace(/\D/g, "");
}

function normalizeValidationStatus(v) {
  const s = String(v || "").trim().toUpperCase();

  if (!s) return null;
  if (s === "VALIDADO_OK") return "OK";

  return s;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  try {
    const rawChave = firstValue(req.query.chave_nfe);
    const rawNNf = firstValue(req.query.n_nf);
    const rawSerie = firstValue(req.query.serie);
    const rawEmitente = firstValue(req.query.emitente);
    const rawDestinatario = firstValue(req.query.destinatario);
    const rawNatureza = firstValue(req.query.natureza_operacao);
    const rawCfop = firstValue(req.query.cfop);
    const rawStatus = firstValue(req.query.status_erp);
    const rawLimit = firstValue(req.query.limit);

    const chave_nfe = String(rawChave || "").trim();
    const n_nf = String(rawNNf || "").trim();
    const serie = String(rawSerie || "").trim();
    const emitente = String(rawEmitente || "").trim();
    const destinatario = String(rawDestinatario || "").trim();
    const natureza_operacao = String(rawNatureza || "").trim();
    const cfop = String(rawCfop || "").trim();

    const lim = Math.min(
      Math.max(parseInt(String(rawLimit || "50"), 10) || 50, 1),
      200
    );

    const params = [];
    const where = [];

    if (chave_nfe) {
      params.push(`%${chave_nfe}%`);
      where.push(`d.chave_nfe ILIKE $${params.length}`);
    }

    if (n_nf) {
      params.push(`%${n_nf}%`);
      where.push(`COALESCE(d.n_nf, '') ILIKE $${params.length}`);
    }

    if (serie) {
      params.push(`%${serie}%`);
      where.push(`COALESCE(d.serie, '') ILIKE $${params.length}`);
    }

    if (emitente) {
      const emitenteDigits = normalizeCnpj(emitente);

      if (emitenteDigits) {
        params.push(`%${emitente}%`);
        const pText = `$${params.length}`;

        params.push(`%${emitenteDigits}%`);
        const pDigits = `$${params.length}`;

        where.push(`(
          COALESCE(d.xnome_emit, '') ILIKE ${pText}
          OR REPLACE(REPLACE(REPLACE(COALESCE(d.cnpj_emit, ''), '.', ''), '/', ''), '-', '') ILIKE ${pDigits}
        )`);
      } else {
        params.push(`%${emitente}%`);
        where.push(`COALESCE(d.xnome_emit, '') ILIKE $${params.length}`);
      }
    }

    if (destinatario) {
      const destinatarioDigits = normalizeCnpj(destinatario);

      if (destinatarioDigits) {
        params.push(`%${destinatario}%`);
        const pText = `$${params.length}`;

        params.push(`%${destinatarioDigits}%`);
        const pDigits = `$${params.length}`;

        where.push(`(
          COALESCE(d.xnome_dest, '') ILIKE ${pText}
          OR REPLACE(REPLACE(REPLACE(COALESCE(d.cnpj_dest, ''), '.', ''), '/', ''), '-', '') ILIKE ${pDigits}
        )`);
      } else {
        params.push(`%${destinatario}%`);
        where.push(`COALESCE(d.xnome_dest, '') ILIKE $${params.length}`);
      }
    }

    if (natureza_operacao) {
      params.push(`%${natureza_operacao}%`);
      where.push(`COALESCE(d.nat_op, '') ILIKE $${params.length}`);
    }

    if (cfop) {
      params.push(`%${cfop}%`);
      where.push(`
        EXISTS (
          SELECT 1
          FROM public.nfe_item fi
          WHERE fi.nfe_id = d.id
            AND COALESCE(fi.cfop, '') ILIKE $${params.length}
        )
      `);
    }

    if (
      rawStatus !== undefined &&
      rawStatus !== null &&
      String(rawStatus).trim() !== ""
    ) {
      const statusInt = parseInt(String(rawStatus), 10);

      if (!Number.isInteger(statusInt) || ![1, 2, 3, 4, 5].includes(statusInt)) {
        return res.status(400).json({
          error: "status_erp inválido",
        });
      }

      params.push(statusInt);
      where.push(`COALESCE(d.status_erp, 2) = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    params.push(lim);
    const limitParam = `$${params.length}`;

    const result = await pool.query(
      `
      SELECT
        d.id,
        d.chave_nfe,
        d.n_nf,
        d.serie,
        d.dh_emi,
        d.xnome_emit,
        d.cnpj_emit,
        d.xnome_dest,
        d.cnpj_dest,
        d.vnf,
        d.created_at,
        d.nat_op AS natureza_operacao,
        d.infcpl,
        d.infadfisco,
        COALESCE(d.status_erp, 2) AS status_erp,

        d.erp_stage_status,
        d.erp_stage_msg,
        d.erp_integracao_id,
        d.erp_stage_updated_at,
        d.erp_integrado_em,

        d.erp_validacao_status,
        d.erp_validacao_msg,
        d.erp_validado_em,
        d.erp_fornecedor_existe,
        d.erp_destinatario_existe,
        d.erp_itens_ok,

        q.status AS queue_status,
        q.tentativas AS queue_tentativas,
        q.last_error AS queue_last_error,
        q.integrado_em AS queue_integrado_em,
        q.mensagem_integracao,

        v.status_validacao AS validacao_status_fallback,
        v.mensagem AS validacao_msg_fallback,
        v.created_at AS validacao_created_at_fallback
      FROM public.nfe_document d
      LEFT JOIN LATERAL (
        SELECT
          qq.status,
          qq.tentativas,
          qq.last_error,
          qq.integrado_em,
          qq.mensagem_integracao
        FROM public.nfe_erp_queue qq
        WHERE qq.nfe_id = d.id
        ORDER BY qq.id DESC
        LIMIT 1
      ) q ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          vv.status_validacao,
          vv.mensagem,
          vv.created_at
        FROM public.nfe_erp_validacao vv
        WHERE vv.nfe_id = d.id
        ORDER BY vv.created_at DESC, vv.id DESC
        LIMIT 1
      ) v ON TRUE
      ${whereSql}
      ORDER BY d.created_at DESC, d.id DESC
      LIMIT ${limitParam}
      `,
      params
    );

    const rows = Array.isArray(result.rows) ? result.rows : [];

    if (rows.length === 0) {
      return res.status(200).json({ rows: [] });
    }

    const cnpjsEmit = [
      ...new Set(rows.map((r) => normalizeCnpj(r.cnpj_emit)).filter(Boolean)),
    ];
    const rowIds = rows.map((r) => r.id);

    const participanteRes =
      cnpjsEmit.length > 0
        ? await pool.query(
            `
            SELECT
              id,
              cnpj,
              xnome
            FROM public.nfe_participante
            WHERE cnpj = ANY($1::varchar[])
            `,
            [cnpjsEmit]
          )
        : { rows: [] };

    const participantes = Array.isArray(participanteRes.rows)
      ? participanteRes.rows
      : [];

    const itemRes =
      rowIds.length > 0
        ? await pool.query(
            `
            SELECT
              i.nfe_id,
              i.n_item,
              i.c_prod AS cprod,
              i.x_prod AS xprod,
              i.cfop,
              m.id AS map_id,
              m.codigo_produto_erp,
              m.ativo,
              m.status_map
            FROM public.nfe_item i
            INNER JOIN public.nfe_document d
              ON d.id = i.nfe_id
            LEFT JOIN public.nfe_item_erp_map m
              ON m.cnpj_fornecedor = d.cnpj_emit
             AND (
               m.cprod_origem = i.c_prod
               OR (
                 COALESCE(NULLIF(TRIM(m.cprod_origem), ''), NULL) IS NULL
                 AND UPPER(COALESCE(m.xprod_origem, '')) = UPPER(COALESCE(i.x_prod, ''))
               )
             )
            WHERE i.nfe_id = ANY($1::bigint[])
            ORDER BY i.nfe_id, i.n_item, i.id
            `,
            [rowIds]
          )
        : { rows: [] };

    const itemRows = Array.isArray(itemRes.rows) ? itemRes.rows : [];
    const itemsByDoc = new Map();

    for (const item of itemRows) {
      if (!itemsByDoc.has(item.nfe_id)) {
        itemsByDoc.set(item.nfe_id, []);
      }
      itemsByDoc.get(item.nfe_id).push(item);
    }

    const enrichedRows = rows.map((row) => {
      const cnpjEmit = normalizeCnpj(row.cnpj_emit);
      const participanteEmit =
        participantes.find((p) => normalizeCnpj(p.cnpj) === cnpjEmit) || null;

      const docItems = itemsByDoc.get(row.id) || [];
      const fallbackPendencias = [];

      const fallbackFornecedorOk = !!participanteEmit;
      let fallbackItensOk = true;

      if (!fallbackFornecedorOk) {
        fallbackPendencias.push(
          `Fornecedor ${row.xnome_emit || "-"} (${cnpjEmit || "-"}) não cadastrado em participantes`
        );
      }

      for (const item of docItems) {
        const hasValidMap =
          !!item.map_id &&
          item.ativo === true &&
          String(item.status_map || "").toUpperCase() !== "IGNORADO" &&
          !!item.codigo_produto_erp;

        if (!hasValidMap) {
          fallbackItensOk = false;
          fallbackPendencias.push(
            `Item ${item.cprod || "-"} - ${item.xprod || "-"} sem de/para ERP`
          );
        }
      }

      const normalizedValidationStatus = normalizeValidationStatus(
        row.erp_validacao_status || row.validacao_status_fallback
      );

      let mapStatus = "NAO_VALIDADO";
      let mapPendencias = [];

      if (normalizedValidationStatus === "OK") {
        mapStatus = "OK";
        mapPendencias = [];
      } else if (normalizedValidationStatus === "PENDENTE_ITEM") {
        mapStatus = "PENDENTE_ITEM";
        mapPendencias = fallbackPendencias;
      } else if (normalizedValidationStatus === "PENDENTE_FORNECEDOR") {
        mapStatus = "PENDENTE_FORNECEDOR";
        mapPendencias = fallbackPendencias;
      } else if (normalizedValidationStatus === "PENDENTE_DESTINATARIO") {
        mapStatus = "PENDENTE_DESTINATARIO";
        mapPendencias = fallbackPendencias;
      } else if (normalizedValidationStatus === "PENDENTE") {
        mapStatus = "PENDENTE";
        mapPendencias = fallbackPendencias;
      } else if (normalizedValidationStatus === "ERRO") {
        mapStatus = "ERRO";
        mapPendencias = fallbackPendencias;
      } else {
        if (!fallbackFornecedorOk) {
          mapStatus = "PENDENTE_FORNECEDOR";
        } else if (!fallbackItensOk) {
          mapStatus = "PENDENTE_ITEM";
        } else {
          mapStatus = "OK";
        }
        mapPendencias = fallbackPendencias;
      }

      return {
        ...row,
        erp_validacao_status: normalizedValidationStatus,
        erp_validacao_msg:
          row.erp_validacao_msg || row.validacao_msg_fallback || null,
        erp_validado_em:
          row.erp_validado_em || row.validacao_created_at_fallback || null,

        map_fornecedor_ok:
          normalizedValidationStatus === "OK"
            ? true
            : row.erp_fornecedor_existe ?? fallbackFornecedorOk,
        map_destinatario_ok:
          normalizedValidationStatus === "OK"
            ? true
            : row.erp_destinatario_existe ?? true,
        map_itens_ok:
          normalizedValidationStatus === "OK"
            ? true
            : row.erp_itens_ok ?? fallbackItensOk,
        map_status: mapStatus,
        map_pendencias: mapPendencias,
        participante_emit_id: participanteEmit?.id || null,
      };
    });

    return res.status(200).json({
      rows: enrichedRows,
    });
  } catch (e) {
    console.error("Erro em GET /api/nfe:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro interno ao listar NFes",
      details: e?.message || String(e),
    });
  }
}