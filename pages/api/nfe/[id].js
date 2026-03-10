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
        COALESCE(status_erp, 2) AS status_erp
      FROM nfe_document
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

    const document = docRes.rows[0];

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
      FROM nfe_item
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
      FROM nfe_payment
      WHERE nfe_id = $1
      ORDER BY id ASC
      `,
      [idInt]
    );

    const payments = Array.isArray(payRes.rows) ? payRes.rows : [];

    // =========================
    // VALIDAÇÃO DE/PARA
    // =========================
    const mapPendencias = [];
    const cnpjEmit = normalizeCnpj(document.cnpj_emit);
    const cnpjDest = normalizeCnpj(document.cnpj_dest);

    // Busca participante base por CNPJ emitente / destinatário
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
    const participanteEmit = participantes.find((p) => normalizeCnpj(p.cnpj) === cnpjEmit) || null;
    const participanteDest = participantes.find((p) => normalizeCnpj(p.cnpj) === cnpjDest) || null;

    // Regra:
    // - se participante existe, consideramos fornecedor/destinatário base ok
    // - de/para ERP é opcional para participante, pois pode usar dados originais
    const mapFornecedorOk = !!participanteEmit;
    const mapDestinatarioOk = !!participanteDest || !cnpjDest;

    if (!mapFornecedorOk) {
      mapPendencias.push(
        `Fornecedor ${document.xnome_emit || "-"} (${cnpjEmit || "-"}) não cadastrado em participantes`
      );
    }

    if (!mapDestinatarioOk) {
      mapPendencias.push(
        `Destinatário ${document.xnome_dest || "-"} (${cnpjDest || "-"}) não cadastrado em participantes`
      );
    }

    // Validação de itens no mapa ERP
    let mapItensOk = true;

    if (items.length > 0 && cnpjEmit) {
      const itemCodes = items
        .map((it) => String(it.cprod || "").trim())
        .filter(Boolean);

      if (itemCodes.length > 0) {
        const itemMapRes = await pool.query(
          `
          SELECT
            id,
            cnpj_fornecedor,
            cprod_origem,
            codigo_produto_erp,
            status_map,
            ativo
          FROM public.nfe_item_erp_map
          WHERE cnpj_fornecedor = $1
            AND cprod_origem = ANY($2::text[])
          `,
          [cnpjEmit, itemCodes]
        );

        const itemMaps = Array.isArray(itemMapRes.rows) ? itemMapRes.rows : [];

        for (const item of items) {
          const cprod = String(item.cprod || "").trim();
          if (!cprod) {
            mapItensOk = false;
            mapPendencias.push(
              `Item ${item.n_item || "-"} sem código de origem (cProd)`
            );
            continue;
          }

          const found = itemMaps.find(
            (m) =>
              normalizeCnpj(m.cnpj_fornecedor) === cnpjEmit &&
              String(m.cprod_origem || "").trim() === cprod &&
              m.ativo === true &&
              String(m.status_map || "").toUpperCase() !== "IGNORADO"
          );

          if (!found || !found.codigo_produto_erp) {
            mapItensOk = false;
            mapPendencias.push(
              `Item ${cprod} - ${item.xprod || "-"} sem de/para ERP`
            );
          }
        }
      } else {
        mapItensOk = false;
        mapPendencias.push("Nenhum item possui cProd para validação de de/para");
      }
    }

    let mapStatus = "OK";

    if (!mapFornecedorOk) {
      mapStatus = "PENDENTE_FORNECEDOR";
    } else if (!mapItensOk) {
      mapStatus = "PENDENTE_ITEM";
    } else if (!mapDestinatarioOk) {
      mapStatus = "PENDENTE_DESTINATARIO";
    }

    return res.status(200).json({
      document: {
        ...document,
        map_fornecedor_ok: mapFornecedorOk,
        map_destinatario_ok: mapDestinatarioOk,
        map_itens_ok: mapItensOk,
        map_status: mapStatus,
        map_pendencias: mapPendencias,
        participante_emit_id: participanteEmit?.id || null,
        participante_dest_id: participanteDest?.id || null,
      },
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