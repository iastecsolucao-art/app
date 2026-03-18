import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida");
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

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
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

function toNumber(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
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

function detectDocType(xmlObj, fallbackMod) {
  const mod = String(fallbackMod || "").trim().toUpperCase();

  if (mod === "NFSE") return "nfse";
  if (mod === "NFE") return "nfe";

  if (xmlObj?.CompNfse || xmlObj?.Nfse || xmlObj?.InfNfse) return "nfse";
  if (xmlObj?.nfeProc || xmlObj?.NFe || xmlObj?.infNFe) return "nfe";

  return "nfe";
}

function extractNfeDataFromXml(xmlObj) {
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
    docType: "nfe",
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

function extractNfseDataFromXml(xmlObj) {
  const compNfse = xmlObj?.CompNfse || xmlObj || {};
  const nfse = compNfse?.Nfse || xmlObj?.Nfse || {};
  const infNfse = nfse?.InfNfse || xmlObj?.InfNfse || {};

  const declaracao =
    infNfse?.DeclaracaoPrestacaoServico?.InfDeclaracaoPrestacaoServico || {};
  const rps = declaracao?.Rps || {};
  const identRps = rps?.IdentificacaoRps || {};

  const prestadorServico = infNfse?.PrestadorServico || {};
  const identPrestador = prestadorServico?.IdentificacaoPrestador || {};

  const tomador = declaracao?.Tomador || {};
  const identTomador = tomador?.IdentificacaoTomador || {};

  const servico = declaracao?.Servico || {};
  const valoresServico = servico?.Valores || {};
  const valoresNfse = infNfse?.ValoresNfse || {};
  const orgaoGerador = infNfse?.OrgaoGerador || {};

  const numero = infNfse?.Numero || null;
  const codigoVerificacao = infNfse?.CodigoVerificacao || null;

  const chave =
    (numero && codigoVerificacao
      ? `nfse_${numero}_${codigoVerificacao}`
      : null) ||
    (numero ? `nfse_${numero}` : null) ||
    String(infNfse?.Id || "") ||
    "-";

  const itemServico = {
    id: 1,
    n_item: 1,
    xprod: servico?.Discriminacao || "-",
    ncm: "-",
    cfop: "-",
    ucom: "UN",
    qcom: 1,
    vuncom: toNumber(valoresServico?.ValorServicos ?? null) ?? 0,
    vprod: toNumber(valoresServico?.ValorServicos ?? null) ?? 0,
  };

  return {
    docType: "nfse",
    document: {
      chave_nfe: chave,
      n_nf: numero || "-",
      serie: identRps?.Serie || "-",
      nat_op: servico?.ItemListaServico || "-",
      natureza_operacao: servico?.ItemListaServico || "-",
      dh_emi: infNfse?.DataEmissao || null,
      dh_sai_ent: null,

      xnome_emit: prestadorServico?.RazaoSocial || "-",
      cnpj_emit: identPrestador?.CpfCnpj?.Cnpj || "-",
      ie_emit: identPrestador?.InscricaoMunicipal || "-",
      uf_emit: prestadorServico?.Endereco?.Uf || "-",
      municipio_emit:
        prestadorServico?.Endereco?.CodigoMunicipio ||
        prestadorServico?.Endereco?.Municipio ||
        "-",

      xnome_dest: tomador?.RazaoSocial || "-",
      cnpj_dest:
        identTomador?.CpfCnpj?.Cnpj ||
        identTomador?.CpfCnpj?.Cpf ||
        "-",
      ie_dest: identTomador?.InscricaoMunicipal || "-",
      uf_dest: tomador?.Endereco?.Uf || "-",
      municipio_dest:
        tomador?.Endereco?.CodigoMunicipio ||
        tomador?.Endereco?.Municipio ||
        "-",

      vprod:
        toNumber(valoresServico?.ValorServicos ?? null) ??
        toNumber(valoresNfse?.ValorLiquidoNfse ?? null) ??
        0,
      vbc:
        toNumber(valoresNfse?.BaseCalculo ?? null) ??
        toNumber(valoresServico?.ValorServicos ?? null) ??
        0,
      vicms: 0,
      vpis: toNumber(valoresServico?.ValorPis ?? null) ?? 0,
      vcofins: toNumber(valoresServico?.ValorCofins ?? null) ?? 0,
      vnf:
        toNumber(valoresNfse?.ValorLiquidoNfse ?? null) ??
        toNumber(valoresServico?.ValorServicos ?? null) ??
        0,

      infcpl: servico?.Discriminacao || "-",
      infadfisco: null,

      nprot: codigoVerificacao || "-",
      xmotivo: null,

      transp_xnome: "-",
      transp_cnpj: "-",
      transp_uf: "-",
      transp_xmun: "-",
      vol_qvol: "-",
      vol_pesob: "-",

      numero_rps: identRps?.Numero || "-",
      data_emissao_rps: rps?.DataEmissao || null,
      codigo_verificacao: codigoVerificacao || "-",
      municipio_gerador: orgaoGerador?.CodigoMunicipio || "-",
      valor_iss:
        toNumber(valoresNfse?.ValorIss ?? null) ??
        toNumber(valoresServico?.ValorIss ?? null) ??
        0,
      aliquota:
        toNumber(valoresNfse?.Aliquota ?? null) ??
        toNumber(valoresServico?.Aliquota ?? null) ??
        0,
      item_lista_servico: servico?.ItemListaServico || "-",
      codigo_tributacao_municipio:
        servico?.CodigoTributacaoMunicipio || "-",
      discriminacao: servico?.Discriminacao || "-",
      codigo_municipio_servico: servico?.CodigoMunicipio || "-",
      codigo_pais_servico: servico?.CodigoPais || "-",
      exigibilidade_iss: servico?.ExigibilidadeISS || "-",
      municipio_incidencia: servico?.MunicipioIncidencia || "-",
      iss_retido: servico?.IssRetido || "-",
    },
    items: [itemServico],
    payments: [],
  };
}

function extractDocumentData(xmlObj, fallbackMod) {
  const docType = detectDocType(xmlObj, fallbackMod);
  return docType === "nfse"
    ? extractNfseDataFromXml(xmlObj)
    : extractNfeDataFromXml(xmlObj);
}

function buildDanfeHtml(document, items, payments, docType = "nfe") {
  const isNfse = docType === "nfse";
  const tituloDocumento = isNfse ? "NFS-e" : "DANFE";
  const subtituloDocumento = isNfse
    ? "Nota Fiscal de Serviços Eletrônica"
    : "Documento Auxiliar da Nota Fiscal Eletrônica";
  const textoRecebimento = isNfse
    ? "RECEBEMOS DE - OS SERVIÇOS CONSTANTES DA NOTA FISCAL DE SERVIÇOS ELETRÔNICA INDICADA ABAIXO."
    : "RECEBEMOS DE - OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO.";

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

  const blocoNfseExtra = isNfse
    ? `
      <div class="row">
        <div class="cell w-20">
          <div class="label">RPS</div>
          <div>${escapeHtml(document?.numero_rps || "-")}</div>
        </div>
        <div class="cell w-20">
          <div class="label">CÓDIGO VERIFICAÇÃO</div>
          <div>${escapeHtml(document?.codigo_verificacao || "-")}</div>
        </div>
        <div class="cell w-20">
          <div class="label">ISS</div>
          <div>${moneyBR(document?.valor_iss)}</div>
        </div>
        <div class="cell w-20">
          <div class="label">ALÍQUOTA</div>
          <div>${escapeHtml(document?.aliquota ?? "-")}</div>
        </div>
        <div class="cell w-20">
          <div class="label">ITEM SERVIÇO</div>
          <div>${escapeHtml(document?.item_lista_servico || "-")}</div>
        </div>
      </div>
    `
    : "";

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(tituloDocumento)} - ${escapeHtml(document?.chave_nfe || "")}</title>
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

        .page {
          width: 100%;
          border: 1px solid #000;
        }

        .row {
          display: flex;
          width: 100%;
        }

        .cell {
          border: 1px solid #000;
          padding: 4px;
        }

        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }

        .title {
          font-size: 16px;
          font-weight: bold;
        }

        .subtitle {
          font-size: 11px;
          font-weight: bold;
        }

        .label {
          font-size: 8px;
          font-weight: bold;
          margin-bottom: 2px;
        }

        .small {
          font-size: 8px;
        }

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
          overflow: hidden;
          word-break: break-all;
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

        .fisco-box {
          min-height: 80px;
        }

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
              ${textoRecebimento}
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
            <div class="title">${escapeHtml(tituloDocumento)}</div>
            <div class="small">${escapeHtml(subtituloDocumento)}</div>
            ${
              isNfse
                ? ""
                : `
                <div class="mt-6">0 - ENTRADA</div>
                <div>1 - SAÍDA</div>
                <div class="mt-6 bold" style="font-size:18px;">1</div>
              `
            }
            <div class="mt-6"><strong>Nº ${escapeHtml(document?.n_nf || "-")}</strong></div>
            <div><strong>Série ${escapeHtml(document?.serie || "-")}</strong></div>
            <div>Folha 1/1</div>
          </div>

          <div class="cell w-40">
            <div class="barcode-box">
              ${escapeHtml(document?.chave_nfe || "-")}
            </div>
            <div class="label center mt-4">${isNfse ? "CHAVE / IDENTIFICAÇÃO" : "CHAVE DE ACESSO"}</div>
            <div class="center bold">${escapeHtml(document?.chave_nfe || "-")}</div>
            <div class="small center mt-4">
              ${isNfse ? "Consulta conforme regras do município / provedor" : "Consulta de autenticidade no portal nacional da NF-e"}
            </div>
            <div class="small center">${isNfse ? "-" : "www.nfe.fazenda.gov.br"}</div>
            <div class="label mt-6">${isNfse ? "CÓDIGO DE VERIFICAÇÃO" : "PROTOCOLO DE AUTORIZAÇÃO DE USO"}</div>
            <div>${escapeHtml(isNfse ? document?.codigo_verificacao || "-" : document?.nprot || "-")}</div>
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

        ${blocoNfseExtra}

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

async function launchBrowser() {
  if (process.env.NODE_ENV === "production") {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = (await import("puppeteer-core")).default;

    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      defaultViewport: chromium.defaultViewport,
      headless: chromium.headless,
    });
  }

  const puppeteer = (await import("puppeteer")).default;

  return puppeteer.launch({
    headless: true,
  });
}

export default async function handler(req, res) {
  let browser = null;

  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({
        error: `Método ${req.method} não permitido`,
      });
    }

    const rawId = firstValue(req.query.id);
    const rawEmpresaId = firstValue(req.query.empresa_id);

    const idInt = Number.parseInt(String(rawId), 10);
    const empresaIdInt = Number.parseInt(String(rawEmpresaId), 10);

    if (!Number.isInteger(idInt) || idInt <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    if (!Number.isInteger(empresaIdInt) || empresaIdInt <= 0) {
      return res.status(400).json({ error: "empresa_id inválido" });
    }

    const docRes = await pool.query(
      `
      SELECT
        id,
        empresa_id,
        chave_nfe,
        mod,
        xml_raw
      FROM public.nfe_document
      WHERE id = $1
        AND empresa_id = $2
      LIMIT 1
      `,
      [idInt, empresaIdInt]
    );

    if (docRes.rowCount === 0) {
      return res.status(404).json({
        error: "Documento não encontrado para esta empresa",
      });
    }

    const rawDocument = docRes.rows[0];

    let document = { ...rawDocument };
    let items = [];
    let payments = [];
    let docType = String(rawDocument.mod || "").toUpperCase() === "NFSE" ? "nfse" : "nfe";

    const xmlObj = getXmlObject(rawDocument.xml_raw);

    if (xmlObj) {
      const fromXml = extractDocumentData(xmlObj, rawDocument.mod);

      if (fromXml?.docType) {
        docType = fromXml.docType;
      }

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
    }

    const html = buildDanfeHtml(document, items, payments, docType);

    browser = await launchBrowser();
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
      `inline; filename="${docType}-${document.chave_nfe || idInt}.pdf"`
    );
    res.setHeader("Cache-Control", "no-store");

    return res.end(pdfBuffer);
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

    return res.status(500).json({
      error: "Erro ao gerar PDF da DANFE/NFS-e",
      details: e?.message || String(e),
    });
  }
}