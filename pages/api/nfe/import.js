import { Pool } from "pg";
import { XMLParser } from "fast-xml-parser";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_VENDEDORES,
});

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // ajuda a não quebrar com tags vazias
  parseTagValue: true,
  trimValues: true,
});

function asArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function onlyDigits(s) {
  return (s ?? "").toString().replace(/\D/g, "");
}

function toNumber(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// tenta achar infNFe em layouts comuns: nfeProc->NFe->infNFe ou NFe->infNFe
function getInfNFe(obj) {
  return (
    obj?.nfeProc?.NFe?.infNFe ||
    obj?.NFe?.infNFe ||
    obj?.nfeProc?.NFe?.infNFeSupl?.infNFe || // fallback (raro)
    null
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }

  try {
    const { xml } = req.body || {};
    if (!xml || typeof xml !== "string") {
      return res.status(400).json({ error: "Campo 'xml' (string) é obrigatório" });
    }

    let parsed;
    try {
      parsed = parser.parse(xml);
    } catch (e) {
      return res.status(400).json({ error: "XML inválido", details: e.message });
    }

    const infNFe = getInfNFe(parsed);
    if (!infNFe) {
      return res.status(400).json({
        error: "Não foi possível localizar infNFe no XML (layout não reconhecido)",
      });
    }

    const ide = infNFe?.ide || {};
    const emit = infNFe?.emit || {};
    const dest = infNFe?.dest || {};
    const total = infNFe?.total?.ICMSTot || {};
    const transp = infNFe?.transp || {};
    const vol = asArray(transp?.vol)[0] || {};
    const infAdic = infNFe?.infAdic || {};

    // chave: preferencialmente atributo Id do infNFe: "NFe3519..."
    const idAttr = infNFe?.["@_Id"] || "";
    const chave = onlyDigits(idAttr).slice(-44) || onlyDigits(infNFe?.chNFe) || null;

    if (!chave || chave.length !== 44) {
      return res.status(400).json({ error: "Chave da NFe não encontrada (44 dígitos)" });
    }

    // datas: dhEmi/dhSaiEnt podem vir como string ISO
    const dhEmi = ide?.dhEmi || ide?.dhemi || null;
    const dhSaiEnt = ide?.dhSaiEnt || ide?.dhSaiEnt || null;

    // nfref pode estar em ide->NFref
    const nfref = asArray(ide?.NFref)[0]?.refNFe || null;

    // protocolo pode estar em nfeProc->protNFe->infProt
    const infProt = parsed?.nfeProc?.protNFe?.infProt || {};
    const cstat = infProt?.cStat || null;
    const xmotivo = infProt?.xMotivo || null;
    const nprot = infProt?.nProt || null;
    const dhrecbto = infProt?.dhRecbto || null;

    // intermediador (infIntermed)
    const intermed = infNFe?.infIntermed || {};

    // transportadora (transporta)
    const transporta = transp?.transporta || {};

    // pagamentos (pag / detPag)
    const pag = infNFe?.pag || {};
    const detPagArr = asArray(pag?.detPag);

    // itens (det)
    const detArr = asArray(infNFe?.det);

    await pool.query("BEGIN");

    try {
      // 1) UPSERT nfe_document por chave_nfe
      const docResult = await pool.query(
        `
          INSERT INTO nfe_document (
            chave_nfe,
            n_nf, serie, mod, tp_nf, nat_op, dh_emi, dh_sai_ent, tpamb,
            indfinal, indpres, indintermed, nfref,
            cstat, xmotivo, nprot, dhrecbto,
            cnpj_emit, xnome_emit, ie_emit, crt_emit, uf_emit, municipio_emit,
            cnpj_dest, xnome_dest, ie_dest, indiedest, uf_dest, municipio_dest,
            vprod, vicms, vbc, vpis, vcofins, vnf, vtottrib,
            infcpl, infadfisco, obscont_xcampo, obscont_xtexto,
            intermed_cnpj, intermed_id,
            modfrete, transp_cnpj, transp_xnome, transp_uf, transp_xmun,
            vol_qvol, vol_pesol, vol_pesob,
            xml_raw
          )
          VALUES (
            $1,
            $2,$3,$4,$5,$6,$7,$8,$9,
            $10,$11,$12,$13,
            $14,$15,$16,$17,
            $18,$19,$20,$21,$22,$23,
            $24,$25,$26,$27,$28,$29,
            $30,$31,$32,$33,$34,$35,$36,
            $37,$38,$39,$40,
            $41,$42,
            $43,$44,$45,$46,$47,
            $48,$49,$50,
            $51
          )
          ON CONFLICT (chave_nfe)
          DO UPDATE SET
            n_nf=EXCLUDED.n_nf,
            serie=EXCLUDED.serie,
            mod=EXCLUDED.mod,
            tp_nf=EXCLUDED.tp_nf,
            nat_op=EXCLUDED.nat_op,
            dh_emi=EXCLUDED.dh_emi,
            dh_sai_ent=EXCLUDED.dh_sai_ent,
            tpamb=EXCLUDED.tpamb,
            indfinal=EXCLUDED.indfinal,
            indpres=EXCLUDED.indpres,
            indintermed=EXCLUDED.indintermed,
            nfref=EXCLUDED.nfref,
            cstat=EXCLUDED.cstat,
            xmotivo=EXCLUDED.xmotivo,
            nprot=EXCLUDED.nprot,
            dhrecbto=EXCLUDED.dhrecbto,
            cnpj_emit=EXCLUDED.cnpj_emit,
            xnome_emit=EXCLUDED.xnome_emit,
            ie_emit=EXCLUDED.ie_emit,
            crt_emit=EXCLUDED.crt_emit,
            uf_emit=EXCLUDED.uf_emit,
            municipio_emit=EXCLUDED.municipio_emit,
            cnpj_dest=EXCLUDED.cnpj_dest,
            xnome_dest=EXCLUDED.xnome_dest,
            ie_dest=EXCLUDED.ie_dest,
            indiedest=EXCLUDED.indiedest,
            uf_dest=EXCLUDED.uf_dest,
            municipio_dest=EXCLUDED.municipio_dest,
            vprod=EXCLUDED.vprod,
            vicms=EXCLUDED.vicms,
            vbc=EXCLUDED.vbc,
            vpis=EXCLUDED.vpis,
            vcofins=EXCLUDED.vcofins,
            vnf=EXCLUDED.vnf,
            vtottrib=EXCLUDED.vtottrib,
            infcpl=EXCLUDED.infcpl,
            infadfisco=EXCLUDED.infadfisco,
            obscont_xcampo=EXCLUDED.obscont_xcampo,
            obscont_xtexto=EXCLUDED.obscont_xtexto,
            intermed_cnpj=EXCLUDED.intermed_cnpj,
            intermed_id=EXCLUDED.intermed_id,
            modfrete=EXCLUDED.modfrete,
            transp_cnpj=EXCLUDED.transp_cnpj,
            transp_xnome=EXCLUDED.transp_xnome,
            transp_uf=EXCLUDED.transp_uf,
            transp_xmun=EXCLUDED.transp_xmun,
            vol_qvol=EXCLUDED.vol_qvol,
            vol_pesol=EXCLUDED.vol_pesol,
            vol_pesob=EXCLUDED.vol_pesob,
            xml_raw=EXCLUDED.xml_raw
          RETURNING id
        `,
        [
          chave,
          ide?.nNF ?? null,
          ide?.serie ?? null,
          ide?.mod ?? null,
          ide?.tpNF ?? null,
          ide?.natOp ?? null,
          dhEmi,
          dhSaiEnt,
          ide?.tpAmb ?? null,

          ide?.indFinal ?? null,
          ide?.indPres ?? null,
          ide?.indIntermed ?? null,
          nfref,

          cstat,
          xmotivo,
          nprot,
          dhrecbto,

          onlyDigits(emit?.CNPJ) || null,
          emit?.xNome ?? null,
          emit?.IE ?? null,
          emit?.CRT ?? null,
          emit?.enderEmit?.UF ?? null,
          emit?.enderEmit?.xMun ?? null,

          onlyDigits(dest?.CNPJ) || null,
          dest?.xNome ?? null,
          dest?.IE ?? null,
          dest?.indIEDest ?? null,
          dest?.enderDest?.UF ?? null,
          dest?.enderDest?.xMun ?? null,

          toNumber(total?.vProd),
          toNumber(total?.vICMS),
          toNumber(total?.vBC),
          toNumber(total?.vPIS),
          toNumber(total?.vCOFINS),
          toNumber(total?.vNF),
          toNumber(total?.vTotTrib),

          infAdic?.infCpl ?? null,
          infAdic?.infAdFisco ?? null,
          asArray(infAdic?.obsCont)[0]?.xCampo ?? null,
          asArray(infAdic?.obsCont)[0]?.xTexto ?? null,

          onlyDigits(intermed?.CNPJ) || null,
          intermed?.idCadIntTran ?? null,

          transp?.modFrete ?? null,
          onlyDigits(transporta?.CNPJ) || null,
          transporta?.xNome ?? null,
          transporta?.UF ?? null,
          transporta?.xMun ?? null,

          toNumber(vol?.qVol),
          toNumber(vol?.pesoL),
          toNumber(vol?.pesoB),

          xml,
        ]
      );

      const nfeId = docResult.rows[0].id;

      // 2) Se reimportar a mesma chave, substitui itens/pagamentos
      await pool.query(`DELETE FROM nfe_item WHERE nfe_id = $1`, [nfeId]);
      await pool.query(`DELETE FROM nfe_payment WHERE nfe_id = $1`, [nfeId]);

      // 3) Itens
      for (const det of detArr) {
        const nItem = Number(det?.["@_nItem"] ?? det?.nItem ?? null);
        const prod = det?.prod || {};
        const imposto = det?.imposto || {};
        const icmsAny = imposto?.ICMS ? Object.values(imposto.ICMS)[0] : null;
        const pisAny = imposto?.PIS ? Object.values(imposto.PIS)[0] : null;
        const cofAny = imposto?.COFINS ? Object.values(imposto.COFINS)[0] : null;

        await pool.query(
          `
            INSERT INTO nfe_item (
              nfe_id, n_item,
              cprod, xprod, ncm, cfop, cest, ucom, qcom, vuncom, vprod, xped,
              vtottrib_item,
              icms_tipo, icms_cst, icms_csosn, icms_orig, icms_modbc, icms_vbc, icms_picms, icms_vicms,
              pis_tipo, pis_cst, pis_vbc, pis_ppis, pis_vpis,
              cofins_tipo, cofins_cst, cofins_vbc, cofins_pcofins, cofins_vcofins,
              infadprod
            )
            VALUES (
              $1,$2,
              $3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
              $13,
              $14,$15,$16,$17,$18,$19,$20,$21,
              $22,$23,$24,$25,$26,
              $27,$28,$29,$30,$31,
              $32
            )
          `,
          [
            nfeId,
            nItem,

            prod?.cProd ?? null,
            prod?.xProd ?? null,
            prod?.NCM ?? null,
            prod?.CFOP ?? null,
            prod?.CEST ?? null,
            prod?.uCom ?? null,
            toNumber(prod?.qCom),
            toNumber(prod?.vUnCom),
            toNumber(prod?.vProd),
            prod?.xPed ?? null,

            toNumber(imposto?.vTotTrib),

            icmsAny ? Object.keys(imposto.ICMS)[0] : null,
            icmsAny?.CST ?? null,
            icmsAny?.CSOSN ?? null,
            icmsAny?.orig ?? null,
            icmsAny?.modBC ?? null,
            toNumber(icmsAny?.vBC),
            toNumber(icmsAny?.pICMS),
            toNumber(icmsAny?.vICMS),

            pisAny ? Object.keys(imposto.PIS)[0] : null,
            pisAny?.CST ?? null,
            toNumber(pisAny?.vBC),
            toNumber(pisAny?.pPIS),
            toNumber(pisAny?.vPIS),

            cofAny ? Object.keys(imposto.COFINS)[0] : null,
            cofAny?.CST ?? null,
            toNumber(cofAny?.vBC),
            toNumber(cofAny?.pCOFINS),
            toNumber(cofAny?.vCOFINS),

            det?.infAdProd ?? null,
          ]
        );
      }

      // 4) Pagamentos
      for (const detPag of detPagArr) {
        const card = detPag?.card || {};
        await pool.query(
          `
            INSERT INTO nfe_payment (
              nfe_id,
              tpag, vpag, indpag,
              card_cnpj, card_tband, card_tpintegra, card_caut
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          `,
          [
            nfeId,
            detPag?.tPag ?? null,
            toNumber(detPag?.vPag),
            detPag?.indPag ?? null,
            onlyDigits(card?.CNPJ) || null,
            card?.tBand ?? null,
            card?.tpIntegra ?? null,
            card?.cAut ?? null,
          ]
        );
      }

      await pool.query("COMMIT");

      return res.status(200).json({
        message: "XML importado com sucesso",
        nfe_id: nfeId,
        chave_nfe: chave,
        itens: detArr.length,
        pagamentos: detPagArr.length,
      });
    } catch (e) {
      await pool.query("ROLLBACK");
      return res.status(500).json({ error: "Erro ao importar", details: e.message });
    }
  } catch (error) {
    return res.status(500).json({ error: "Erro interno do servidor", details: error.message });
  }
}
