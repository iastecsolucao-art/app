import { Pool } from "pg";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._nfePgPoolDanfePdf;

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

  global._nfePgPoolDanfePdf = pool;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function onlyDigits(v) {
  return String(v || "").replace(/\D/g, "");
}

function moneyBR(v) {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return escapeHtml(String(v));
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateBR(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return escapeHtml(String(value));
  }
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function getXmlObject(xmlRaw) {
  if (!xmlRaw) return null;

  if (typeof xmlRaw === "string") {
    const text = xmlRaw.trim();
    if (!text) return null;

    if (text.startsWith("{") || text.startsWith("[")) {
      return JSON.parse(text);
    }

    return null;
  }

  if (typeof xmlRaw === "object") {
    return xmlRaw;
  }

  return null;
}

function extractDanfeDataFromXml(xmlObj) {
  const nfeProc = xmlObj?.nfeProc || xmlObj || {};
  const nfe = nfeProc?.NFe || xmlObj?.NFe || {};
  const protNFe = nfeProc?.protNFe || {};

  const infNFe = nfe?.infNFe || {};
  const ide = infNFe?.ide || {};
  const emit = infNFe?.emit || {};
  const dest = infNFe?.dest || {};
  const transp = infNFe?.transp || {};
  const vol = toArray(transp?.vol)[0] || {};
  const total = infNFe?.total?.ICMSTot || {};
  const pag = infNFe?.pag || {};
  const det = toArray(infNFe?.det);

  const pagamentos = toArray(pag?.detPag).map((p, index) => ({
    id: index + 1,
    tpag: p?.tPag || "-",
    vpag: p?.vPag || "-",
  }));

  const itens = det.map((item, index) => {
    const prod = item?.prod || {};
    return {
      id: index + 1,
      n_item: item?.nItem || index + 1,
      xprod: prod?.xProd || "-",
      ncm: prod?.NCM || "-",
      cfop: prod?.CFOP || "-",
      ucom: prod?.uCom || "-",
      qcom: prod?.qCom || "-",
      vuncom: prod?.vUnCom || "-",
      vprod: prod?.vProd || "-",
    };
  });

  return {
    document: {
      chave_nfe: String(infNFe?.Id || "").replace(/^NFe/i, "") || "-",
      n_nf: ide?.nNF || "-",
      serie: ide?.serie || "-",
      nat_op: ide?.natOp || "-",
      natureza_operacao: ide?.natOp || "-",
      dh_emi: ide?.dhEmi || null,
      dh_sai_ent: ide?.dhSaiEnt || null,

      xnome_emit: emit?.xNome || "-",
      cnpj_emit: emit?.CNPJ || emit?.CPF || "-",
      ie_emit: emit?.IE || "-",
      uf_emit: emit?.enderEmit?.UF || "-",
      municipio_emit: emit?.enderEmit?.xMun || "-",

      xnome_dest: dest?.xNome || "-",
      cnpj_dest: dest?.CNPJ || dest?.CPF || "-",
      ie_dest: dest?.IE || "-",
      uf_dest: dest?.enderDest?.UF || "-",
      municipio_dest: dest?.enderDest?.xMun || "-",

      vprod: total?.vProd || "0",
      vbc: total?.vBC || "0",
      vicms: total?.vICMS || "0",
      vpis: total?.vPIS || "0",
      vcofins: total?.vCOFINS || "0",
      vnf: total?.vNF || "0",

      infcpl: infNFe?.infAdic?.infCpl || "-",
      infadfisco: infNFe?.infAdic?.infAdFisco || "-",

      nprot: protNFe?.infProt?.nProt || "-",
      xmotivo: protNFe?.infProt?.xMotivo || "-",

      transp_xnome: transp?.transporta?.xNome || "-",
      transp_cnpj: transp?.transporta?.CNPJ || transp?.transporta?.CPF || "-",
      transp_uf: transp?.transporta?.UF || "-",
      transp_xmun: transp?.transporta?.xMun || "-",
      vol_qvol: vol?.qVol || "-",
      vol_pesob: vol?.pesoB || "-",
    },
    items: itens,
    payments: pagamentos,
  };
}

function buildDanfeHtml(document, items, payments) {
  const natureza = document?.natureza_operacao || document?.nat_op || "-";

  const itemsHtml =
    Array.isArray(items) && items.length > 0
      ? items
          .map(
            (it) => `
              <tr>
                <td class="center">${escapeHtml(it.n_item ?? "-")}</td>
                <td>${escapeHtml(it.xprod ?? "-")}</td>
                <td class="center">${escapeHtml(it.ncm ?? "-")}</td>
                <td class="center">${escapeHtml(it.cfop ?? "-")}</td>
                <td class="center">${escapeHtml(it.ucom ?? "-")}</td>
                <td class="right">${escapeHtml(it.qcom ?? "-")}</td>
                <td class="right">${moneyBR(it.vuncom)}</td>
                <td class="right">${moneyBR(it.vprod)}</td>
              </tr>
            `
          )
          .join("")
      : `
        <tr>
          <td colspan="8" class="center">Nenhum item encontrado.</td>
        </tr>
      `;

  const paymentsHtml =
    Array.isArray(payments) && payments.length > 0
      ? payments
          .map(
            (p) => `
              <div style="margin-bottom: 2px;">
                <strong>${escapeHtml(p.tpag || "-")}</strong> - ${moneyBR(p.vpag)}
              </div>
            `
          )
          .join("")
      : `<div>-</div>`;

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>DANFE - ${escapeHtml(document?.chave_nfe || "")}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 8px;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
          color: #000;
          background: #fff;
        }
        .page { width: 100%; border: 1px solid #000; }
        .row { display: flex; width: 100%; }
        .cell { border: 1px solid #000; padding: 4px; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .title { font-size: 16px; font-weight: bold; }
        .subtitle { font-size: 11px; font-weight: bold; }
        .label { font-size: 8px; font-weight: bold; margin-bottom: 2px; }
        .small { font-size: 8px; }
        .mt-4 { margin-top: 4px; }
        .mt-6 { margin-top: 6px; }

        .w-100 { width: 100%; }
        .w-70 { width: 70%; }
        .w-50 { width: 50%; }
        .w-40 { width: 40%; }
        .w-35 { width: 35%; }
        .w-30 { width: 30%; }
        .w-20 { width: 20%; }
        .w-15 { width: 15%; }
        .w-10 { width: 10%; }

        .barcode-box {
          border: 1px solid #000;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          letter-spacing: 1px;
          font-size: 10px;
          font-weight: bold;
        }

        .danfe-box { min-height: 130px; }
        .emit-box { min-height: 130px; }
        .canhoto { min-height: 58px; }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
        }

        th, td {
          border: 1px solid #000;
          padding: 3px;
          vertical-align: top;
        }

        th {
          background: #f3f3f3;
          font-size: 8px;
        }

        .section-title {
          font-size: 8px;
          font-weight: bold;
          text-transform: uppercase;
        }

        .fisco-box { min-height: 80px; }

        @page {
          size: A4 portrait;
          margin: 7mm;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="row">
          <div class="cell w-70 canhoto">
            <div class="small">
              RECEBEMOS DE <strong>${escapeHtml(document?.xnome_emit || "-")}</strong>
              OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO.
              DESTINATÁRIO: <strong>${escapeHtml(document?.xnome_dest || "-")}</strong>.
              VALOR TOTAL: <strong>${moneyBR(document?.vnf)}</strong>.
            </div>
          </div>
          <div class="cell w-30 canhoto">
            <div class="label">DATA DE RECEBIMENTO</div>
            <div style="height:18px;"></div>
            <div class="label">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</div>
          </div>
        </div>

        <div class="row">
          <div class="cell w-40 emit-box">
            <div class="center subtitle">IDENTIFICAÇÃO DO EMITENTE</div>
            <div class="title mt-6">${escapeHtml(document?.xnome_emit || "-")}</div>
            <div class="mt-6">CNPJ: ${escapeHtml(onlyDigits(document?.cnpj_emit) || "-")}</div>
            <div>IE: ${escapeHtml(document?.ie_emit || "-")}</div>
            <div>UF: ${escapeHtml(document?.uf_emit || "-")}</div>
            <div>Município: ${escapeHtml(document?.municipio_emit || "-")}</div>
          </div>

          <div class="cell w-20 danfe-box center">
            <div class="title">DANFE</div>
            <div class="small">Documento Auxiliar da Nota Fiscal Eletrônica</div>
            <div class="mt-6">0 - ENTRADA</div>
            <div>1 - SAÍDA</div>
            <div class="mt-6 bold" style="font-size:18px;">1</div>
            <div class="mt-6"><strong>Nº ${escapeHtml(document?.n_nf || "-")}</strong></div>
            <div><strong>Série ${escapeHtml(document?.serie || "-")}</strong></div>
            <div>Folha 1/1</div>
          </div>

          <div class="cell w-40">
            <div class="barcode-box">
              ${escapeHtml(document?.chave_nfe || "-")}
            </div>
            <div class="label center mt-4">CHAVE DE ACESSO</div>
            <div class="center bold">${escapeHtml(document?.chave_nfe || "-")}</div>
            <div class="small center mt-4">
              Consulta de autenticidade no portal nacional da NF-e
            </div>
            <div class="small center">www.nfe.fazenda.gov.br</div>
            <div class="label mt-6">PROTOCOLO DE AUTORIZAÇÃO DE USO</div>
            <div>${escapeHtml(document?.nprot || "-")}</div>
          </div>
        </div>

        <div class="row">
          <div class="cell w-50">
            <div class="label">NATUREZA DA OPERAÇÃO</div>
            <div>${escapeHtml(natureza)}</div>
          </div>
          <div class="cell w-20">
            <div class="label">INSCRIÇÃO ESTADUAL</div>
            <div>${escapeHtml(document?.ie_emit || "-")}</div>
          </div>
          <div class="cell w-15">
            <div class="label">CNPJ</div>
            <div>${escapeHtml(onlyDigits(document?.cnpj_emit) || "-")}</div>
          </div>
          <div class="cell w-15">
            <div class="label">DATA DE EMISSÃO</div>
            <div>${escapeHtml(formatDateBR(document?.dh_emi))}</div>
          </div>
        </div>

        <div class="row">
          <div class="cell w-100 section-title">DESTINATÁRIO / REMETENTE</div>
        </div>

        <div class="row">
          <div class="cell w-50">
            <div class="label">NOME / RAZÃO SOCIAL</div>
            <div>${escapeHtml(document?.xnome_dest || "-")}</div>
          </div>
          <div class="cell w-20">
            <div class="label">CNPJ / CPF</div>
            <div>${escapeHtml(onlyDigits(document?.cnpj_dest) || "-")}</div>
          </div>
          <div class="cell w-15">
            <div class="label">UF</div>
            <div>${escapeHtml(document?.uf_dest || "-")}</div>
          </div>
          <div class="cell w-15">
            <div class="label">INSCRIÇÃO ESTADUAL</div>
            <div>${escapeHtml(document?.ie_dest || "-")}</div>
          </div>
        </div>

        <div class="row">
          <div class="cell w-40">
            <div class="label">MUNICÍPIO</div>
            <div>${escapeHtml(document?.municipio_dest || "-")}</div>
          </div>
          <div class="cell w-20">
            <div class="label">DATA DE ENTRADA / SAÍDA</div>
            <div>${escapeHtml(formatDateBR(document?.dh_sai_ent || document?.dh_emi))}</div>
          </div>
          <div class="cell w-20">
            <div class="label">HORA DE ENTRADA / SAÍDA</div>
            <div>-</div>
          </div>
          <div class="cell w-20">
            <div class="label">PAGAMENTOS</div>
            ${paymentsHtml}
          </div>
        </div>

        <div class="row">
          <div class="cell w-100 section-title">CÁLCULO DO IMPOSTO</div>
        </div>

        <div class="row">
          <div class="cell w-15">
            <div class="label">BASE ICMS</div>
            <div>${moneyBR(document?.vbc)}</div>
          </div>
          <div class="cell w-15">
            <div class="label">VALOR ICMS</div>
            <div>${moneyBR(document?.vicms)}</div>
          </div>
          <div class="cell w-15">
            <div class="label">VALOR PIS</div>
            <div>${moneyBR(document?.vpis)}</div>
          </div>
          <div class="cell w-15">
            <div class="label">VALOR COFINS</div>
            <div>${moneyBR(document?.vcofins)}</div>
          </div>
          <div class="cell w-20">
            <div class="label">VALOR PRODUTOS</div>
            <div>${moneyBR(document?.vprod)}</div>
          </div>
          <div class="cell w-20">
            <div class="label">VALOR TOTAL NF</div>
            <div><strong>${moneyBR(document?.vnf)}</strong></div>
          </div>
        </div>

        <div class="row">
          <div class="cell w-100 section-title">TRANSPORTADOR / VOLUMES TRANSPORTADOS</div>
        </div>

        <div class="row">
          <div class="cell w-35">
            <div class="label">RAZÃO SOCIAL</div>
            <div>${escapeHtml(document?.transp_xnome || "-")}</div>
          </div>
          <div class="cell w-20">
            <div class="label">CNPJ</div>
            <div>${escapeHtml(onlyDigits(document?.transp_cnpj) || "-")}</div>
          </div>
          <div class="cell w-10">
            <div class="label">UF</div>
            <div>${escapeHtml(document?.transp_uf || "-")}</div>
          </div>
          <div class="cell w-15">
            <div class="label">MUNICÍPIO</div>
            <div>${escapeHtml(document?.transp_xmun || "-")}</div>
          </div>
          <div class="cell w-10">
            <div class="label">QTD VOLUMES</div>
            <div>${escapeHtml(document?.vol_qvol || "-")}</div>
          </div>
          <div class="cell w-10">
            <div class="label">PESO BRUTO</div>
            <div>${escapeHtml(document?.vol_pesob || "-")}</div>
          </div>
        </div>

        <div class="row">
          <div class="cell w-100 section-title">DADOS DOS PRODUTOS / SERVIÇOS</div>
        </div>

        <div class="row">
          <div class="cell w-100" style="padding:0;">
            <table>
              <thead>
                <tr>
                  <th style="width:5%;">ITEM</th>
                  <th style="width:41%;">DESCRIÇÃO</th>
                  <th style="width:10%;">NCM</th>
                  <th style="width:8%;">CFOP</th>
                  <th style="width:7%;">UN</th>
                  <th style="width:9%;">QTD</th>
                  <th style="width:10%;">VL UNIT</th>
                  <th style="width:10%;">VL TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
        </div>

        <div class="row">
          <div class="cell w-70">
            <div class="section-title">INFORMAÇÕES COMPLEMENTARES</div>
            <div class="mt-4">${escapeHtml(document?.infcpl || "-")}</div>
            ${
              document?.infadfisco
                ? `<div class="mt-6"><strong>Informações ao Fisco:</strong> ${escapeHtml(document.infadfisco)}</div>`
                : ""
            }
          </div>
          <div class="cell w-30 fisco-box">
            <div class="section-title">RESERVADO AO FISCO</div>
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}

export default async function handler(req, res) {
  let browser = null;

  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      res.status(405).json({
        error: `Método ${req.method} não permitido`,
      });
      return;
    }

    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const idInt = Number.parseInt(String(rawId), 10);

    if (!Number.isInteger(idInt) || idInt <= 0) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const docRes = await pool.query(
      `
      SELECT
        id,
        chave_nfe,
        xml_raw
      FROM public.nfe_document
      WHERE id = $1
      LIMIT 1
      `,
      [idInt]
    );

    if (docRes.rowCount === 0) {
      res.status(404).json({
        error: "Documento não encontrado",
      });
      return;
    }

    const rawDocument = docRes.rows[0];

    let document = {
      ...rawDocument,
    };

    let items = [];
    let payments = [];

    const xmlObj = getXmlObject(rawDocument.xml_raw);

    console.log("========================================");
    console.log("GET /api/nfe/[id]/danfe-pdf");
    console.log("id:", idInt);
    console.log("chave_nfe banco:", rawDocument.chave_nfe);
    console.log("xml_raw tipo:", typeof rawDocument.xml_raw);
    console.log("========================================");

    if (xmlObj) {
      const fromXml = extractDanfeDataFromXml(xmlObj);

      if (fromXml?.document) {
        document = {
          ...document,
          ...fromXml.document,
        };
      }

      if (Array.isArray(fromXml?.items)) {
        items = fromXml.items;
      }

      if (Array.isArray(fromXml?.payments)) {
        payments = fromXml.payments;
      }

      console.log("DANFE gerada com base no xml_raw.");
      console.log("chave_nfe xml:", document.chave_nfe);
      console.log("emitente:", document.xnome_emit);
      console.log("destinatario:", document.xnome_dest);
      console.log("itens:", items.length);
      console.log("pagamentos:", payments.length);
    } else {
      console.log("xml_raw não pôde ser interpretado.");
    }

    const html = buildDanfeHtml(document, items, payments);

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "7mm",
        right: "7mm",
        bottom: "7mm",
        left: "7mm",
      },
    });

    await page.close();
    await browser.close();
    browser = null;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="nfe-${document.chave_nfe || idInt}.pdf"`
    );
    res.setHeader("Cache-Control", "no-store");

    res.end(pdfBuffer);
  } catch (e) {
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }

    console.error("Erro em GET /api/nfe/[id]/danfe-pdf:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    res.status(500).json({
      error: "Erro ao gerar PDF da DANFE",
      details: e?.message || String(e),
    });
  }
}