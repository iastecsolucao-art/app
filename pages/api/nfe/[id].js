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
    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const idInt = Number.parseInt(String(rawId), 10);

    if (!Number.isInteger(idInt) || idInt <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const docRes = await pool.query(
      `
      SELECT
        id,
        chave_nfe,
        n_nf,
        serie,
        mod,
        tp_nf,
        nat_op,
        dh_emi,
        dh_sai_ent,
        tpamb,
        indfinal,
        indpres,
        indintermed,
        nfref,
        cstat,
        xmotivo,
        nprot,
        dhrecbto,
        cnpj_emit,
        xnome_emit,
        ie_emit,
        crt_emit,
        uf_emit,
        municipio_emit,
        cnpj_dest,
        xnome_dest,
        ie_dest,
        indiedest,
        uf_dest,
        municipio_dest,
        vprod,
        vicms,
        vbc,
        vpis,
        vcofins,
        vnf,
        vtottrib,
        infcpl,
        infadfisco,
        obscont_xcampo,
        obscont_xtexto,
        intermed_cnpj,
        intermed_id,
        modfrete,
        transp_cnpj,
        transp_xnome,
        transp_uf,
        transp_xmun,
        vol_qvol,
        vol_pesol,
        vol_pesob,
        xml_raw,
        created_at,
        COALESCE(status_erp, 2) AS status_erp,

        erp_stage_status,
        erp_stage_msg,
        erp_integracao_id,
        erp_stage_updated_at,
        erp_integrado_em,

        erp_validacao_status,
        erp_validacao_msg,
        erp_validado_em,
        erp_fornecedor_existe,
        erp_destinatario_existe,
        erp_itens_ok
      FROM public.nfe_document
      WHERE id = $1
      LIMIT 1
      `,
      [idInt]
    );

    if (docRes.rowCount === 0) {
      return res.status(404).json({
        error: "Documento não encontrado",
      });
    }

    const rawDocument = docRes.rows[0];

    const itemRes = await pool.query(
      `
      SELECT
        id,
        nfe_id,
        n_item,
        c_prod       AS cprod,
        x_prod       AS xprod,
        ncm,
        cfop,
        u_com        AS ucom,
        q_com        AS qcom,
        v_un_com     AS vuncom,
        v_prod       AS vprod,
        cest,
        cean         AS cean,
        ceantrib     AS ceantrib,
        u_trib       AS utrib,
        q_trib       AS qtrib,
        v_un_trib    AS vuntrib,
        v_frete_item AS vfrete_item,
        v_seg_item   AS vseg_item,
        v_desc_item  AS vdesc_item,
        v_outro_item AS voutro_item,
        ind_tot      AS indtot,
        xped,
        c_benef      AS cbenef,
        extipi,
        vtottrib_item,
        icms_tipo,
        icms_cst,
        icms_csosn,
        icms_orig,
        icms_modbc,
        icms_vbc,
        icms_picms,
        icms_vicms,
        pis_tipo,
        pis_cst,
        pis_vbc,
        pis_ppis,
        pis_vpis,
        cofins_tipo,
        cofins_cst,
        cofins_vbc,
        cofins_pcofins,
        cofins_vcofins,
        ipi_tipo,
        ipi_cst,
        ipi_cenq,
        ipi_vbc,
        ipi_pipi,
        ipi_vipi,
        ipi_qunid,
        ipi_vunid,
        infadprod
      FROM public.nfe_item
      WHERE nfe_id = $1
      ORDER BY n_item ASC, id ASC
      `,
      [idInt]
    );

    const items = Array.isArray(itemRes.rows) ? itemRes.rows : [];

    const payRes = await pool.query(
      `
      SELECT
        id,
        nfe_id,
        tpag,
        vpag,
        indpag,
        card_cnpj,
        card_tband,
        card_tpintegra,
        card_caut
      FROM public.nfe_payment
      WHERE nfe_id = $1
      ORDER BY id ASC
      `,
      [idInt]
    );

    const payments = Array.isArray(payRes.rows) ? payRes.rows : [];

    const queueRes = await pool.query(
      `
      SELECT
        id,
        status,
        tentativas,
        last_error,
        integrado_em,
        reservado_em,
        reservado_por,
        mensagem_integracao,
        created_at,
        updated_at
      FROM public.nfe_erp_queue
      WHERE nfe_id = $1
      ORDER BY id DESC
      LIMIT 1
      `,
      [idInt]
    );

    const queue = queueRes.rows[0] || null;

    const validacaoRes = await pool.query(
      `
      SELECT
        id,
        status_validacao,
        mensagem,
        payload_json,
        created_at,
        updated_at
      FROM public.nfe_erp_validacao
      WHERE nfe_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1
      `,
      [idInt]
    );

    const validacao = validacaoRes.rows[0] || null;

    const mapPendencias = [];
    const cnpjEmit = normalizeCnpj(rawDocument.cnpj_emit);
    const cnpjDest = normalizeCnpj(rawDocument.cnpj_dest);

    const partRes = await pool.query(
      `
      SELECT
        id,
        tipo,
        cnpj,
        xnome,
        ie,
        uf,
        municipio
      FROM public.nfe_participante
      WHERE cnpj IN ($1, $2)
      `,
      [cnpjEmit || "", cnpjDest || ""]
    );

    const participantes = Array.isArray(partRes.rows) ? partRes.rows : [];
    const participanteEmit =
      participantes.find((p) => normalizeCnpj(p.cnpj) === cnpjEmit) || null;
    const participanteDest =
      participantes.find((p) => normalizeCnpj(p.cnpj) === cnpjDest) || null;

    const fallbackFornecedorOk = !!participanteEmit;
    const fallbackDestinatarioOk = !!participanteDest || !cnpjDest;

    if (!fallbackFornecedorOk) {
      mapPendencias.push(
        `Fornecedor ${rawDocument.xnome_emit || "-"} (${cnpjEmit || "-"}) não cadastrado em participantes`
      );
    }

    if (!fallbackDestinatarioOk) {
      mapPendencias.push(
        `Destinatário ${rawDocument.xnome_dest || "-"} (${cnpjDest || "-"}) não cadastrado em participantes`
      );
    }

    let fallbackItensOk = true;

    if (items.length > 0 && cnpjEmit) {
      const itemMapRes = await pool.query(
        `
        SELECT
          id,
          participante_id,
          cnpj_fornecedor,
          cprod_origem,
          xprod_origem,
          codigo_produto_erp,
          descricao_erp,
          status_map,
          ativo
        FROM public.nfe_item_erp_map
        WHERE cnpj_fornecedor = $1
          AND COALESCE(ativo, true) = true
        `,
        [cnpjEmit]
      );

      const itemMaps = Array.isArray(itemMapRes.rows) ? itemMapRes.rows : [];

      for (const item of items) {
        const cprod = String(item.cprod || "").trim();
        const xprod = String(item.xprod || "").trim().toUpperCase();

        const found = itemMaps.find((m) => {
          const mapCprod = String(m.cprod_origem || "").trim();
          const mapXprod = String(m.xprod_origem || "").trim().toUpperCase();
          const mapStatus = String(m.status_map || "").trim().toUpperCase();

          if (m.ativo !== true) return false;
          if (mapStatus === "IGNORADO") return false;

          if (mapCprod && cprod && mapCprod === cprod) return true;
          if (!mapCprod && mapXprod && xprod && mapXprod === xprod) return true;

          return false;
        });

        if (!cprod && !xprod) {
          fallbackItensOk = false;
          mapPendencias.push(`Item ${item.n_item || "-"} sem código/descrição de origem`);
          continue;
        }

        if (!found || !found.codigo_produto_erp) {
          fallbackItensOk = false;
          mapPendencias.push(
            `Item ${cprod || "-"} - ${item.xprod || "-"} sem de/para ERP`
          );
        }
      }
    } else if (items.length > 0 && !cnpjEmit) {
      fallbackItensOk = false;
      mapPendencias.push("Emitente sem CNPJ para validação de de/para dos itens");
    }

    const normalizedValidationStatus = normalizeValidationStatus(
      rawDocument.erp_validacao_status || validacao?.status_validacao
    );

    let mapStatus = "NAO_VALIDADO";
    let finalMapPendencias = [];

    if (normalizedValidationStatus === "OK") {
      mapStatus = "OK";
      finalMapPendencias = [];
    } else if (normalizedValidationStatus === "PENDENTE_ITEM") {
      mapStatus = "PENDENTE_ITEM";
      finalMapPendencias = mapPendencias;
    } else if (normalizedValidationStatus === "PENDENTE_FORNECEDOR") {
      mapStatus = "PENDENTE_FORNECEDOR";
      finalMapPendencias = mapPendencias;
    } else if (normalizedValidationStatus === "PENDENTE_DESTINATARIO") {
      mapStatus = "PENDENTE_DESTINATARIO";
      finalMapPendencias = mapPendencias;
    } else if (normalizedValidationStatus === "PENDENTE") {
      mapStatus = "PENDENTE";
      finalMapPendencias = mapPendencias;
    } else if (normalizedValidationStatus === "ERRO") {
      mapStatus = "ERRO";
      finalMapPendencias = mapPendencias;
    } else {
      if (!fallbackFornecedorOk) {
        mapStatus = "PENDENTE_FORNECEDOR";
      } else if (!fallbackItensOk) {
        mapStatus = "PENDENTE_ITEM";
      } else if (!fallbackDestinatarioOk) {
        mapStatus = "PENDENTE_DESTINATARIO";
      } else {
        mapStatus = "OK";
      }
      finalMapPendencias = mapPendencias;
    }

    const document = {
      ...rawDocument,

      natureza_operacao: rawDocument.nat_op || null,

      map_fornecedor_ok:
        normalizedValidationStatus === "OK" ? true : (rawDocument.erp_fornecedor_existe ?? fallbackFornecedorOk),
      map_destinatario_ok:
        normalizedValidationStatus === "OK" ? true : (rawDocument.erp_destinatario_existe ?? fallbackDestinatarioOk),
      map_itens_ok:
        normalizedValidationStatus === "OK" ? true : (rawDocument.erp_itens_ok ?? fallbackItensOk),
      map_status: mapStatus,
      map_pendencias: finalMapPendencias,
      participante_emit_id: participanteEmit?.id || null,
      participante_dest_id: participanteDest?.id || null,

      fila_erp_id: queue?.id || null,
      fila_erp_status: queue?.status || null,
      fila_erp_tentativas: queue?.tentativas ?? 0,
      fila_erp_last_error: queue?.last_error || null,
      fila_erp_integrado_em: queue?.integrado_em || null,
      fila_erp_reservado_em: queue?.reservado_em || null,
      fila_erp_reservado_por: queue?.reservado_por || null,
      fila_erp_mensagem_integracao: queue?.mensagem_integracao || null,

      queue_id: queue?.id || null,
      queue_status: queue?.status || null,
      queue_tentativas: queue?.tentativas ?? 0,
      queue_last_error: queue?.last_error || null,
      queue_integrado_em: queue?.integrado_em || null,
      queue_reservado_em: queue?.reservado_em || null,
      queue_reservado_por: queue?.reservado_por || null,
      mensagem_integracao: queue?.mensagem_integracao || null,
      queue_message: queue?.mensagem_integracao || null,

      validacao_erp_id: validacao?.id || null,
      validacao_erp_status: normalizedValidationStatus,
      validacao_erp_mensagem: rawDocument.erp_validacao_msg || validacao?.mensagem || null,
      validacao_erp_payload: validacao?.payload_json || null,
      validacao_erp_created_at: rawDocument.erp_validado_em || validacao?.created_at || null,

      erp_validacao_status: normalizedValidationStatus,
      erp_validacao_msg: rawDocument.erp_validacao_msg || validacao?.mensagem || null,
      erp_validado_em: rawDocument.erp_validado_em || validacao?.created_at || null,
      erp_validacao_payload: validacao?.payload_json || null,
    };

    return res.status(200).json({
      document,
      items,
      payments,
    });
  } catch (e) {
    console.error("Erro em GET /api/nfe/[id]:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro interno ao buscar detalhes da NFe",
      details: e?.message || String(e),
    });
  }
}