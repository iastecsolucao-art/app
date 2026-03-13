import { useEffect, useMemo, useState } from "react"; 

 

function onlyDigits(s) { 

  return (s ?? "").toString().replace(/\D/g, ""); 

} 

 

function extractChaveQuick(xmlText) { 

  const m = (xmlText || "").match(/Id=['"]NFe(\d{44})['"]/i); 

  return m ? m[1] : null; 

} 

 

function formatDateBR(value) { 

  if (!value) return "-"; 

  try { 

    return new Date(value).toLocaleString("pt-BR"); 

  } catch { 

    return String(value); 

  } 

} 

 

function moneyBR(v) { 

  if (v == null || v === "") return "-"; 

  const n = Number(v); 

  if (Number.isNaN(n)) return String(v); 

  return n.toLocaleString("pt-BR", { 

    style: "currency", 

    currency: "BRL", 

  }); 

} 

 

function parseMultiTerms(value) { 

  return String(value || "") 

    .split(",") 

    .map((s) => s.trim().toLowerCase()) 

    .filter(Boolean); 

} 

 

function containsAnyTerm(source, terms) { 

  if (!terms.length) return true; 

  const base = String(source || "").toLowerCase(); 

  return terms.some((term) => base.includes(term)); 

} 

 

function resumoObservacao(row) { 

  const text = 

    row?.infcpl || 

    row?.infadfisco || 

    row?.erp_stage_msg || 

    row?.erp_validacao_msg || 

    row?.mensagem_integracao || 

    row?.obs || 

    ""; 

 

  const s = String(text || "").trim(); 

  if (!s) return "-"; 

  return s.length > 90 ? `${s.slice(0, 90)}...` : s; 

} 

 

function getQueueStatusText(rowOrDetail) { 

  const obj = rowOrDetail || {}; 

 

  const queueStatus = String( 

    obj.queue_status || 

      obj.fila_erp_status || 

      obj.status_integracao || 

      obj.queue?.status || 

      "" 

  ) 

    .toUpperCase() 

    .trim(); 

 

  const queueMessage = String( 

    obj.queue_message || 

      obj.mensagem_integracao || 

      obj.queue?.mensagem_integracao || 

      obj.queue?.message || 

      "" 

  ) 

    .toUpperCase() 

    .trim(); 

 

  if ( 

    queueStatus === "SEM_PEDIDO" || 

    queueMessage.includes("SEM NÚMERO DE PEDIDO") || 

    queueMessage.includes("SEM NUMERO DE PEDIDO") || 

    queueMessage.includes("PEDIDO NÃO IDENTIFICADO") || 

    queueMessage.includes("PEDIDO NAO IDENTIFICADO") 

  ) { 

    return "SEM_PEDIDO"; 

  } 

 

  if (queueStatus) return queueStatus; 

 

  return ""; 

} 

 

function getErpStatusInfo(rowOrDetail) { 

  const obj = rowOrDetail || {}; 

 

  const stage = String(obj.erp_stage_status || "").toUpperCase().trim(); 

  const validacao = String(obj.erp_validacao_status || "").toUpperCase().trim(); 

  const statusErp = Number(obj.status_erp); 

  const queueStatus = getQueueStatusText(obj); 

 

  if (queueStatus === "SEM_PEDIDO") { 

    return { 

      label: "Parado na fila - sem pedido", 

      style: { 

        background: "#ffe5e5", 

        color: "#b00020", 

        border: "1px solid #f2b8b5", 

      }, 

    }; 

  } 

 

  if (stage === "INTEGRADO") { 

    return { 

      label: "Integrado", 

      style: { 

        background: "#e6f7e8", 

        color: "#166534", 

        border: "1px solid #9ed8a6", 

      }, 

    }; 

  } 

 

  if (stage === "INTEGRADO_DIVERGENCIA") { 

    return { 

      label: "Integrado com divergência", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (stage === "INTEGRADO_DIVERGENCIA_QTD") { 

    return { 

      label: "Integrado com divergência de quantidade", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (stage === "INTEGRADO_DIVERGENCIA_VALOR") { 

    return { 

      label: "Integrado com divergência de valor", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (stage === "INTEGRADO_DIVERGENCIA_QTD_VALOR") { 

    return { 

      label: "Integrado com divergência de quantidade e valor", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (stage === "ERRO") { 

    return { 

      label: "Erro na integração", 

      style: { 

        background: "#ffe5e5", 

        color: "#b00020", 

        border: "1px solid #f2b8b5", 

      }, 

    }; 

  } 

 

  if (stage === "DUPLICADA" || stage === "DUPLICADA_STAGE") { 

    return { 

      label: "NF duplicada", 

      style: { 

        background: "#f3f4f6", 

        color: "#374151", 

        border: "1px solid #d1d5db", 

      }, 

    }; 

  } 

 

  if (stage === "PROCESSANDO") { 

    return { 

      label: "Processando ERP", 

      style: { 

        background: "#dff1ff", 

        color: "#0b5cab", 

        border: "1px solid #8ec5ff", 

      }, 

    }; 

  } 

 

  if (stage === "PENDENTE") { 

    return { 

      label: "Pendente no ERP", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (validacao === "PENDENTE_ITEM") { 

    return { 

      label: "Item pendente", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (validacao === "PENDENTE_FORNECEDOR") { 

    return { 

      label: "Fornecedor pendente", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (validacao === "PENDENTE_DESTINATARIO") { 

    return { 

      label: "Destinatário pendente", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (statusErp === 5) { 

    return { 

      label: "Integrado com divergência", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (statusErp === 4) { 

    return { 

      label: "Erro na integração", 

      style: { 

        background: "#ffe5e5", 

        color: "#b00020", 

        border: "1px solid #f2b8b5", 

      }, 

    }; 

  } 

 

  if (statusErp === 3) { 

    return { 

      label: "Processada no ERP", 

      style: { 

        background: "#e6f7e8", 

        color: "#166534", 

        border: "1px solid #9ed8a6", 

      }, 

    }; 

  } 

 

  if (statusErp === 2) { 

    return { 

      label: "Importada / Aguardando envio ao ERP", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (statusErp === 1) { 

    return { 

      label: "Enviada ao ERP / Aguardando retorno", 

      style: { 

        background: "#dff1ff", 

        color: "#0b5cab", 

        border: "1px solid #8ec5ff", 

      }, 

    }; 

  } 

 

  return { 

    label: "Pendente", 

    style: { 

      background: "#f3f4f6", 

      color: "#374151", 

      border: "1px solid #d1d5db", 

    }, 

  }; 

} 

 

function filaStatusColor(v) { 

  const s = String(v || "").toUpperCase(); 

 

  if (s === "PENDENTE") { 

    return { 

      background: "#fff7d6", 

      color: "#8a6700", 

      border: "1px solid #f3d46b", 

    }; 

  } 

 

  if (s === "PROCESSANDO") { 

    return { 

      background: "#dff1ff", 

      color: "#0b5cab", 

      border: "1px solid #8ec5ff", 

    }; 

  } 

 

  if (s === "INTEGRADO") { 

    return { 

      background: "#e6f7e8", 

      color: "#166534", 

      border: "1px solid #9ed8a6", 

    }; 

  } 

 

  if (s === "ERRO") { 

    return { 

      background: "#ffe5e5", 

      color: "#b00020", 

      border: "1px solid #f2b8b5", 

    }; 

  } 

 

  if (s === "SEM_PEDIDO") { 

    return { 

      background: "#ffe5e5", 

      color: "#b00020", 

      border: "1px solid #f2b8b5", 

    }; 

  } 

 

  return { 

    background: "#f3f4f6", 

    color: "#374151", 

    border: "1px solid #d1d5db", 

  }; 

} 

 

function mapStatusInfo(rowOrDetail) { 

  const obj = rowOrDetail || {}; 

 

  const fornecedorOk = obj.map_fornecedor_ok; 

  const itensOk = obj.map_itens_ok; 

  const pendencias = Array.isArray(obj.map_pendencias) ? obj.map_pendencias : []; 

  const mapStatus = String(obj.map_status || obj.erp_validacao_status || "").toUpperCase().trim(); 

 

  const queueStatus = getQueueStatusText(obj); 

 

  if (queueStatus === "SEM_PEDIDO") { 

    return { 

      label: "Sem pedido", 

      style: { 

        background: "#ffe5e5", 

        color: "#b00020", 

        border: "1px solid #f2b8b5", 

      }, 

    }; 

  } 

 

  if (mapStatus === "OK") { 

    return { 

      label: "De/Para OK", 

      style: { 

        background: "#e6f7e8", 

        color: "#166534", 

        border: "1px solid #9ed8a6", 

      }, 

    }; 

  } 

 

  if (mapStatus === "PENDENTE_ITEM") { 

    return { 

      label: "Item pendente", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (mapStatus === "PENDENTE_FORNECEDOR") { 

    return { 

      label: "Fornecedor pendente", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (mapStatus === "PENDENTE_DESTINATARIO") { 

    return { 

      label: "Destinatário pendente", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if ( 

    mapStatus === "PENDENTE" || 

    fornecedorOk === false || 

    itensOk === false || 

    pendencias.length > 0 

  ) { 

    return { 

      label: "De/Para pendente", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

      }, 

    }; 

  } 

 

  if (mapStatus === "ERRO") { 

    return { 

      label: "Erro no de/para", 

      style: { 

        background: "#ffe5e5", 

        color: "#b00020", 

        border: "1px solid #f2b8b5", 

      }, 

    }; 

  } 

 

  if (fornecedorOk === true && itensOk === true) { 

    return { 

      label: "De/Para OK", 

      style: { 

        background: "#e6f7e8", 

        color: "#166534", 

        border: "1px solid #9ed8a6", 

      }, 

    }; 

  } 

 

  return { 

    label: "Não validado", 

    style: { 

      background: "#f3f4f6", 

      color: "#374151", 

      border: "1px solid #d1d5db", 

    }, 

  }; 

} 

 

function DanfePdfViewer({ nfeId, chaveNfe, onClose }) { 

  if (!nfeId) return null; 

 

  const pdfUrl = `/api/nfe/${nfeId}/danfe-pdf`; 

 

  return ( 

    <div 

      style={{ 

        position: "fixed", 

        inset: 0, 

        background: "rgba(0,0,0,0.55)", 

        zIndex: 9999, 

        display: "flex", 

        justifyContent: "center", 

        alignItems: "flex-start", 

        padding: 20, 

        overflowY: "auto", 

      }} 

    > 

      <div 

        style={{ 

          width: "100%", 

          maxWidth: 1320, 

          background: "#fff", 

          borderRadius: 12, 

          boxShadow: "0 12px 30px rgba(0,0,0,0.25)", 

          overflow: "hidden", 

        }} 

      > 

        <div 

          style={{ 

            padding: "14px 18px", 

            borderBottom: "1px solid #e5e7eb", 

            display: "flex", 

            justifyContent: "space-between", 

            alignItems: "center", 

            gap: 12, 

            flexWrap: "wrap", 

            background: "#f9fafb", 

          }} 

        > 

          <strong>PDF da NF-e — {chaveNfe || nfeId}</strong> 

 

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}> 

            <a href={pdfUrl} target="_blank" rel="noreferrer" style={linkButtonStyle}> 

              Abrir em nova guia 

            </a> 

 

            <a href={pdfUrl} download style={linkButtonStyle}> 

              Baixar PDF 

            </a> 

 

            <button onClick={onClose}>Fechar</button> 

          </div> 

        </div> 

 

        <div 

          style={{ 

            width: "100%", 

            height: "85vh", 

            background: "#111827", 

          }} 

        > 

          <iframe 

            src={pdfUrl} 

            title={`PDF DANFE ${chaveNfe || nfeId}`} 

            style={{ 

              width: "100%", 

              height: "100%", 

              border: "none", 

              background: "#111827", 

            }} 

          /> 

        </div> 

      </div> 

    </div> 

  ); 

} 

 

function DetailPanel({ 

  detail, 

  loadingDetail, 

  onDownloadXml, 

  onCopyKey, 

  onOpenDanfe, 

}) { 

  if (loadingDetail) { 

    return ( 

      <div style={detailCardStyle}> 

        <strong>Carregando detalhes...</strong> 

      </div> 

    ); 

  } 

 

  if (!detail) { 

    return ( 

      <div style={detailCardStyle}> 

        <strong>Selecione uma NF-e para ver os detalhes.</strong> 

      </div> 

    ); 

  } 

 

  const doc = detail.document || {}; 

  const items = Array.isArray(detail.items) ? detail.items : []; 

  const payments = Array.isArray(detail.payments) ? detail.payments : []; 

  const mapInfo = mapStatusInfo(doc); 

  const erpStatusInfo = getErpStatusInfo(doc); 

 

  const observacoes = [ 

    doc.infcpl, 

    doc.infadfisco, 

    doc.erp_stage_msg, 

    doc.erp_validacao_msg, 

    doc.mensagem_integracao, 

    doc.obs, 

  ] 

    .map((v) => String(v || "").trim()) 

    .filter(Boolean); 

 

  const queueStatusText = 

    getQueueStatusText(doc) || 

    doc.queue_status || 

    doc.fila_erp_status || 

    "-"; 

 

  return ( 

    <div style={detailCardStyle}> 

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}> 

        <div> 

          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Detalhes da NF-e</h3> 

          <div><strong>Chave:</strong> {doc.chave_nfe || "-"}</div> 

          <div><strong>Número/Série:</strong> {doc.n_nf || "-"} / {doc.serie || "-"}</div> 

          <div><strong>Natureza:</strong> {doc.natureza_operacao || doc.nat_op || "-"}</div> 

          <div><strong>Status ERP:</strong> {erpStatusInfo.label}</div> 

          <div><strong>Status fila:</strong> {queueStatusText}</div> 

          <div><strong>Validação ERP:</strong> {doc.erp_validacao_status || doc.validacao_erp_status || "-"}</div> 

        </div> 

 

        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}> 

          <span style={{ ...erpStatusInfo.style, borderRadius: 999, padding: "6px 10px", fontSize: 12 }}> 

            {erpStatusInfo.label} 

          </span> 

 

          <span style={{ ...filaStatusColor(queueStatusText), borderRadius: 999, padding: "6px 10px", fontSize: 12 }}> 

            {queueStatusText || "Sem fila"} 

          </span> 

 

          <span style={{ ...mapInfo.style, borderRadius: 999, padding: "6px 10px", fontSize: 12 }}> 

            {mapInfo.label} 

          </span> 

        </div> 

      </div> 

 

      <hr style={{ margin: "14px 0" }} /> 

 

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}> 

        <div> 

          <h4 style={{ marginTop: 0 }}>Emitente</h4> 

          <div><strong>Nome:</strong> {doc.xnome_emit || "-"}</div> 

          <div><strong>CNPJ:</strong> {onlyDigits(doc.cnpj_emit) || "-"}</div> 

          <div><strong>UF:</strong> {doc.uf_emit || "-"}</div> 

          <div><strong>Município:</strong> {doc.municipio_emit || "-"}</div> 

        </div> 

 

        <div> 

          <h4 style={{ marginTop: 0 }}>Destinatário</h4> 

          <div><strong>Nome:</strong> {doc.xnome_dest || "-"}</div> 

          <div><strong>CNPJ:</strong> {onlyDigits(doc.cnpj_dest) || "-"}</div> 

          <div><strong>UF:</strong> {doc.uf_dest || "-"}</div> 

          <div><strong>Município:</strong> {doc.municipio_dest || "-"}</div> 

        </div> 

 

        <div> 

          <h4 style={{ marginTop: 0 }}>Totais</h4> 

          <div><strong>Produtos:</strong> {moneyBR(doc.vprod)}</div> 

          <div><strong>ICMS:</strong> {moneyBR(doc.vicms)}</div> 

          <div><strong>PIS:</strong> {moneyBR(doc.vpis)}</div> 

          <div><strong>COFINS:</strong> {moneyBR(doc.vcofins)}</div> 

          <div><strong>Valor NF:</strong> {moneyBR(doc.vnf)}</div> 

        </div> 

      </div> 

 

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}> 

        <button onClick={() => onCopyKey(doc.chave_nfe)}>Copiar chave</button> 

        <button onClick={() => onDownloadXml(doc.id)}>Baixar XML</button> 

        <button onClick={onOpenDanfe}>Visualizar DANFE</button> 

      </div> 

 

      {observacoes.length > 0 ? ( 

        <div style={{ marginTop: 16 }}> 

          <h4>Observações</h4> 

          <div 

            style={{ 

              background: "#f9fafb", 

              border: "1px solid #e5e7eb", 

              borderRadius: 8, 

              padding: 12, 

              whiteSpace: "pre-wrap", 

              lineHeight: 1.5, 

              fontSize: 13, 

            }} 

          > 

            {observacoes.map((obs, idx) => ( 

              <div key={idx} style={{ marginBottom: idx < observacoes.length - 1 ? 10 : 0 }}> 

                {obs} 

              </div> 

            ))} 

          </div> 

        </div> 

      ) : null} 

 

      <div style={{ marginTop: 16 }}> 

        <h4>Itens ({items.length})</h4> 

        <div style={{ overflowX: "auto" }}> 

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}> 

            <thead> 

              <tr> 

                <th style={tableHead}>Item</th> 

                <th style={tableHead}>Descrição</th> 

                <th style={tableHead}>CFOP</th> 

                <th style={tableHead}>NCM</th> 

                <th style={tableHead}>Qtd</th> 

                <th style={tableHead}>Valor</th> 

              </tr> 

            </thead> 

            <tbody> 

              {items.length === 0 ? ( 

                <tr> 

                  <td colSpan={6} style={tableCellEmpty}>Nenhum item encontrado.</td> 

                </tr> 

              ) : ( 

                items.map((it) => ( 

                  <tr key={it.id}> 

                    <td style={tableCell}>{it.n_item || "-"}</td> 

                    <td style={tableCell}>{it.xprod || "-"}</td> 

                    <td style={tableCell}>{it.cfop || "-"}</td> 

                    <td style={tableCell}>{it.ncm || "-"}</td> 

                    <td style={tableCell}>{it.qcom ?? "-"}</td> 

                    <td style={tableCell}>{moneyBR(it.vprod)}</td> 

                  </tr> 

                )) 

              )} 

            </tbody> 

          </table> 

        </div> 

      </div> 

 

      <div style={{ marginTop: 16 }}> 

        <h4>Pagamentos ({payments.length})</h4> 

        {payments.length === 0 ? ( 

          <div>Nenhum pagamento encontrado.</div> 

        ) : ( 

          payments.map((p) => ( 

            <div key={p.id}> 

              <strong>tPag:</strong> {p.tpag || "-"} | <strong>vPag:</strong> {moneyBR(p.vpag)} 

            </div> 

          )) 

        )} 

      </div> 

 

      {Array.isArray(doc.map_pendencias) && doc.map_pendencias.length > 0 ? ( 

        <div style={{ marginTop: 16 }}> 

          <h4>Pendências de de/para</h4> 

          <ul style={{ marginTop: 8 }}> 

            {doc.map_pendencias.map((p, idx) => ( 

              <li key={idx}>{p}</li> 

            ))} 

          </ul> 

        </div> 

      ) : null} 

    </div> 

  ); 

} 

 

export default function NfeImport() { 

  const [xmlText, setXmlText] = useState(""); 

  const [fileName, setFileName] = useState(""); 

  const [importMsg, setImportMsg] = useState(""); 

  const [loading, setLoading] = useState(false); 

  const [sendingErpId, setSendingErpId] = useState(null); 

  const [reprocessingId, setReprocessingId] = useState(null); 

 

  const [filters, setFilters] = useState({ 

    chave_nfe: "", 

    n_nf: "", 

    serie: "", 

    emitente: "", 

    destinatario: "", 

    natureza_operacao: "", 

    cfop: "", 

    status_erp: "", 

  }); 

 

  const [docs, setDocs] = useState([]); 

  const [selectedId, setSelectedId] = useState(null); 

  const [detail, setDetail] = useState(null); 

  const [loadingDetail, setLoadingDetail] = useState(false); 

  const [showDanfePdf, setShowDanfePdf] = useState(false); 

 

  const chavePreview = useMemo(() => extractChaveQuick(xmlText), [xmlText]); 

 

  async function loadDocs(customFilters) { 

    try { 

      const f = customFilters || filters; 

      const params = new URLSearchParams(); 

 

      if (f.chave_nfe?.trim()) params.set("chave_nfe", f.chave_nfe.trim()); 

      if (f.n_nf?.trim()) params.set("n_nf", f.n_nf.trim()); 

      if (f.serie?.trim()) params.set("serie", f.serie.trim()); 

      if (f.emitente?.trim()) params.set("emitente", f.emitente.trim()); 

      if (f.destinatario?.trim()) params.set("destinatario", f.destinatario.trim()); 

      if (f.natureza_operacao?.trim()) params.set("natureza_operacao", f.natureza_operacao.trim()); 

      if (f.cfop?.trim()) params.set("cfop", f.cfop.trim()); 

      if (f.status_erp?.trim()) params.set("status_erp", f.status_erp.trim()); 

 

      const res = await fetch(`/api/nfe?${params.toString()}`); 

      const data = await res.json().catch(() => ({})); 

 

      if (!res.ok) { 

        throw new Error(data?.error || data?.details || `Falha ao carregar (${res.status})`); 

      } 

 

      setDocs(Array.isArray(data.rows) ? data.rows : []); 

    } catch (e) { 

      const msg = e instanceof Error ? e.message : String(e); 

      setImportMsg("Erro ao carregar documentos: " + msg); 

      setDocs([]); 

    } 

  } 

 

  useEffect(() => { 

    loadDocs(); 

  }, []); 

 

  const filteredDocs = useMemo(() => { 

    const naturezaTerms = parseMultiTerms(filters.natureza_operacao); 

    const cfopTerms = parseMultiTerms(filters.cfop); 

 

    return docs.filter((row) => { 

      const naturezaOk = containsAnyTerm(row.natureza_operacao || row.nat_op || "", naturezaTerms); 

 

      const cfopSource = 

        row.cfop || 

        row.cfops || 

        row.cfop_resumo || 

        ""; 

 

      const cfopOk = containsAnyTerm(cfopSource, cfopTerms); 

 

      return naturezaOk && cfopOk; 

    }); 

  }, [docs, filters.natureza_operacao, filters.cfop]); 

 

  async function onPickFile(e) { 

    const f = e.target.files?.[0]; 

    if (!f) return; 

 

    setFileName(f.name); 

    setImportMsg(""); 

    setDetail(null); 

    setSelectedId(null); 

 

    const text = await f.text(); 

    setXmlText(text); 

  } 

 

  async function importar() { 

    if (!xmlText) { 

      setImportMsg("Erro: selecione um XML primeiro."); 

      return; 

    } 

 

    setLoading(true); 

    setImportMsg(""); 

 

    try { 

      const res = await fetch("/api/nfe/import", { 

        method: "POST", 

        headers: { "Content-Type": "application/json" }, 

        body: JSON.stringify({ xml: xmlText }), 

      }); 

 

      const data = await res.json().catch(() => ({})); 

      if (!res.ok) { 

        throw new Error(data?.error || data?.details || `Falha (${res.status})`); 

      } 

 

      setImportMsg( 

        `${data.message || "Importado com sucesso"} | Chave: ${data.chave_nfe || "-"} | Itens: ${ 

          data.itens ?? 0 

        } | Pag: ${data.pagamentos ?? 0}` 

      ); 

 

      setXmlText(""); 

      setFileName(""); 

      await loadDocs(); 

    } catch (e) { 

      const msg = e instanceof Error ? e.message : String(e); 

      setImportMsg("Erro ao importar: " + msg); 

    } finally { 

      setLoading(false); 

    } 

  } 

 

  async function verDetalhe(id) { 

    try { 

      setSelectedId(id); 

      setDetail(null); 

      setLoadingDetail(true); 

      setImportMsg(""); 

 

      const res = await fetch(`/api/nfe/${id}`); 

      const data = await res.json().catch(() => ({})); 

 

      if (!res.ok) { 

        throw new Error(data?.details || data?.error || `Falha ao buscar detalhe (${res.status})`); 

      } 

 

      setDetail({ 

        document: data.document || {}, 

        items: Array.isArray(data.items) ? data.items : [], 

        payments: Array.isArray(data.payments) ? data.payments : [], 

      }); 

    } catch (e) { 

      const msg = e instanceof Error ? e.message : String(e); 

      setImportMsg("Erro ao buscar detalhes: " + msg); 

    } finally { 

      setLoadingDetail(false); 

    } 

  } 

 

  async function enviarParaErp(id) { 

    try { 

      setSendingErpId(id); 

      setImportMsg(""); 

 

      const res = await fetch(`/api/nfe/${id}/enviar-erp`, { 

        method: "POST", 

        headers: { "Content-Type": "application/json" }, 

      }); 

 

      const data = await res.json().catch(() => ({})); 

 

      if (!res.ok) { 

        const pendencias = Array.isArray(data?.map_pendencias) 

          ? data.map_pendencias.join(" | ") 

          : ""; 

        throw new Error(data?.details || data?.error || pendencias || `Falha (${res.status})`); 

      } 

 

      setImportMsg(data?.message || "NF enviada para fila do ERP com sucesso."); 

      await loadDocs(); 

 

      if (selectedId === id) { 

        await verDetalhe(id); 

      } 

    } catch (e) { 

      const msg = e instanceof Error ? e.message : String(e); 

      setImportMsg("Erro ao enviar para ERP: " + msg); 

    } finally { 

      setSendingErpId(null); 

    } 

  } 

 

  async function reprocessarErp(id) { 

    try { 

      setReprocessingId(id); 

      setImportMsg(""); 

 

      const res = await fetch(`/api/nfe/${id}/reprocessar-erp`, { 

        method: "POST", 

        headers: { "Content-Type": "application/json" }, 

      }); 

 

      const data = await res.json().catch(() => ({})); 

 

      if (!res.ok) { 

        throw new Error(data?.details || data?.error || `Falha (${res.status})`); 

      } 

 

      setImportMsg(data?.message || "NF enviada para reprocessamento."); 

      await loadDocs(); 

 

      if (selectedId === id) { 

        await verDetalhe(id); 

      } 

    } catch (e) { 

      const msg = e instanceof Error ? e.message : String(e); 

      setImportMsg("Erro ao reprocessar ERP: " + msg); 

    } finally { 

      setReprocessingId(null); 

    } 

  } 

 

  async function baixarXml(id) { 

    try { 

      const res = await fetch(`/api/nfe/${id}/xml`); 

      if (!res.ok) { 

        const data = await res.json().catch(() => ({})); 

        throw new Error(data?.details || data?.error || `Falha (${res.status})`); 

      } 

 

      const blob = await res.blob(); 

      const url = window.URL.createObjectURL(blob); 

      const a = document.createElement("a"); 

      a.href = url; 

      a.download = `nfe-${id}.xml`; 

      document.body.appendChild(a); 

      a.click(); 

      a.remove(); 

      window.URL.revokeObjectURL(url); 

    } catch (e) { 

      const msg = e instanceof Error ? e.message : String(e); 

      setImportMsg("Erro ao baixar XML: " + msg); 

    } 

  } 

 

  async function copiarChave(chave) { 

    try { 

      await navigator.clipboard.writeText(String(chave || "")); 

      setImportMsg("Chave copiada com sucesso."); 

    } catch { 

      setImportMsg("Não foi possível copiar a chave."); 

    } 

  } 

 

  return ( 

    <div style={{ padding: 16 }}> 

      <h1 style={{ marginTop: 0 }}>NF-e</h1> 

 

      <div style={cardStyle}> 

        <h3 style={{ marginTop: 0 }}>Importar XML</h3> 

 

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}> 

          <input type="file" accept=".xml,text/xml" onChange={onPickFile} /> 

          <button onClick={importar} disabled={loading || !xmlText}> 

            {loading ? "Importando..." : "Importar XML"} 

          </button> 

        </div> 

 

        <div style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}> 

          <div><strong>Arquivo:</strong> {fileName || "-"}</div> 

          <div><strong>Chave (preview):</strong> {chavePreview || "-"}</div> 

        </div> 

 

        {xmlText ? ( 

          <textarea 

            value={xmlText} 

            onChange={(e) => setXmlText(e.target.value)} 

            rows={8} 

            style={{ width: "100%", marginTop: 12 }} 

          /> 

        ) : null} 

      </div> 

 

      <div style={cardStyle}> 

        <h3 style={{ marginTop: 0 }}>Filtros</h3> 

 

        <div style={filterGridStyle}> 

          <input 

            placeholder="Chave NF-e" 

            value={filters.chave_nfe} 

            onChange={(e) => setFilters((old) => ({ ...old, chave_nfe: e.target.value }))} 

          /> 

          <input 

            placeholder="Número" 

            value={filters.n_nf} 

            onChange={(e) => setFilters((old) => ({ ...old, n_nf: e.target.value }))} 

          /> 

          <input 

            placeholder="Série" 

            value={filters.serie} 

            onChange={(e) => setFilters((old) => ({ ...old, serie: e.target.value }))} 

          /> 

          <input 

            placeholder="Emitente" 

            value={filters.emitente} 

            onChange={(e) => setFilters((old) => ({ ...old, emitente: e.target.value }))} 

          /> 

          <input 

            placeholder="Destinatário" 

            value={filters.destinatario} 

            onChange={(e) => setFilters((old) => ({ ...old, destinatario: e.target.value }))} 

          /> 

          <input 

            placeholder="Natureza (aceita múltiplos separados por vírgula)" 

            value={filters.natureza_operacao} 

            onChange={(e) => setFilters((old) => ({ ...old, natureza_operacao: e.target.value }))} 

          /> 

          <input 

            placeholder="CFOP (aceita múltiplos separados por vírgula)" 

            value={filters.cfop} 

            onChange={(e) => setFilters((old) => ({ ...old, cfop: e.target.value }))} 

          /> 

          <input 

            placeholder="Status ERP" 

            value={filters.status_erp} 

            onChange={(e) => setFilters((old) => ({ ...old, status_erp: e.target.value }))} 

          /> 

        </div> 

 

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}> 

          <button onClick={() => loadDocs()}>Pesquisar</button> 

          <button 

            onClick={() => { 

              const clear = { 

                chave_nfe: "", 

                n_nf: "", 

                serie: "", 

                emitente: "", 

                destinatario: "", 

                natureza_operacao: "", 

                cfop: "", 

                status_erp: "", 

              }; 

              setFilters(clear); 

              loadDocs(clear); 

            }} 

          > 

            Limpar 

          </button> 

        </div> 

      </div> 

 

      {importMsg ? ( 

        <div 

          style={{ 

            marginBottom: 16, 

            padding: 12, 

            borderRadius: 8, 

            background: "#f3f4f6", 

            border: "1px solid #d1d5db", 

            whiteSpace: "pre-wrap", 

          }} 

        > 

          {importMsg} 

        </div> 

      ) : null} 

 

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16 }}> 

        <div style={cardStyle}> 

          <h3 style={{ marginTop: 0 }}>Documentos ({filteredDocs.length})</h3> 

 

          <div style={{ overflowX: "auto" }}> 

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}> 

              <thead> 

                <tr> 

                  <th style={tableHead}>Chave</th> 

                  <th style={tableHead}>Emitente</th> 

                  <th style={tableHead}>Destinatário</th> 

                  <th style={tableHead}>Natureza</th> 

                  <th style={tableHead}>VNF</th> 

                  <th style={tableHead}>Status ERP</th> 

                  <th style={tableHead}>De/Para</th> 

                  <th style={tableHead}>Observação</th> 

                  <th style={tableHead}>Criado em</th> 

                  <th style={tableHead}>Ações</th> 

                </tr> 

              </thead> 

 

              <tbody> 

                {filteredDocs.length === 0 ? ( 

                  <tr> 

                    <td colSpan={10} style={tableCellEmpty}> 

                      Nenhum documento encontrado. 

                    </td> 

                  </tr> 

                ) : ( 

                  filteredDocs.map((row) => { 

                    const erpInfo = getErpStatusInfo(row); 

                    const mapInfo = mapStatusInfo(row); 

 

                    return ( 

                      <tr 

                        key={row.id} 

                        style={{ 

                          background: selectedId === row.id ? "#f9fafb" : "#fff", 

                        }} 

                      > 

                        <td style={tableCell}> 

                          <div style={{ maxWidth: 220, wordBreak: "break-all" }}> 

                            {row.chave_nfe || "-"} 

                          </div> 

                        </td> 

 

                        <td style={tableCell}> 

                          <div>{row.xnome_emit || "-"}</div> 

                          <div style={{ color: "#6b7280", fontSize: 12 }}> 

                            {onlyDigits(row.cnpj_emit) || "-"} 

                          </div> 

                        </td> 

 

                        <td style={tableCell}> 

                          <div>{row.xnome_dest || "-"}</div> 

                          <div style={{ color: "#6b7280", fontSize: 12 }}> 

                            {onlyDigits(row.cnpj_dest) || "-"} 

                          </div> 

                        </td> 

 

                        <td style={tableCell}>{row.natureza_operacao || row.nat_op || "-"}</td> 

 

                        <td style={tableCell}>{moneyBR(row.vnf)}</td> 

 

                        <td style={tableCell}> 

                          <span 

                            style={{ 

                              ...erpInfo.style, 

                              borderRadius: 999, 

                              padding: "6px 10px", 

                              fontSize: 12, 

                              display: "inline-block", 

                            }} 

                          > 

                            {erpInfo.label} 

                          </span> 

                        </td> 

 

                        <td style={tableCell}> 

                          <span 

                            style={{ 

                              ...mapInfo.style, 

                              borderRadius: 999, 

                              padding: "6px 10px", 

                              fontSize: 12, 

                              display: "inline-block", 

                            }} 

                          > 

                            {mapInfo.label} 

                          </span> 

                        </td> 

 

                        <td style={tableCell} title={row.infcpl || row.infadfisco || row.erp_stage_msg || row.erp_validacao_msg || row.mensagem_integracao || ""}> 

                          {resumoObservacao(row)} 

                        </td> 

 

                        <td style={tableCell}>{formatDateBR(row.created_at)}</td> 

 

                        <td style={tableCell}> 

                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}> 

                            <button onClick={() => verDetalhe(row.id)}>Ver detalhes</button> 

                            <button onClick={() => baixarXml(row.id)}>Baixar XML</button> 

                            <button 

                              onClick={() => { 

                                setSelectedId(row.id); 

                                if (!detail || detail?.document?.id !== row.id) { 

                                  verDetalhe(row.id).then(() => setShowDanfePdf(true)); 

                                } else { 

                                  setShowDanfePdf(true); 

                                } 

                              }} 

                            > 

                              Ver DANFE 

                            </button> 

                            <button 

                              onClick={() => reprocessarErp(row.id)} 

                              disabled={reprocessingId === row.id} 

                            > 

                              {reprocessingId === row.id ? "Reprocessando..." : "Reprocessar ERP"} 

                            </button> 

                            <button 

                              onClick={() => enviarParaErp(row.id)} 

                              disabled={sendingErpId === row.id} 

                            > 

                              {sendingErpId === row.id ? "Enviando..." : "Enviar ERP"} 

                            </button> 

                          </div> 

                        </td> 

                      </tr> 

                    ); 

                  }) 

                )} 

              </tbody> 

            </table> 

          </div> 

        </div> 

 

        <DetailPanel 

          detail={detail} 

          loadingDetail={loadingDetail} 

          onDownloadXml={baixarXml} 

          onCopyKey={copiarChave} 

          onOpenDanfe={() => setShowDanfePdf(true)} 

        /> 

      </div> 

 

      {showDanfePdf ? ( 

        <DanfePdfViewer 

          nfeId={detail?.document?.id || selectedId} 

          chaveNfe={detail?.document?.chave_nfe} 

          onClose={() => setShowDanfePdf(false)} 

        /> 

      ) : null} 

    </div> 

  ); 

} 

 

const cardStyle = { 

  background: "#fff", 

  border: "1px solid #e5e7eb", 

  borderRadius: 12, 

  padding: 16, 

  marginBottom: 16, 

  boxShadow: "0 1px 2px rgba(0,0,0,0.04)", 

}; 

 

const detailCardStyle = { 

  background: "#fff", 

  border: "1px solid #e5e7eb", 

  borderRadius: 12, 

  padding: 16, 

  minHeight: 320, 

  boxShadow: "0 1px 2px rgba(0,0,0,0.04)", 

}; 

 

const filterGridStyle = { 

  display: "grid", 

  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 

  gap: 10, 

}; 

 

const tableHead = { 

  textAlign: "left", 

  padding: "10px 8px", 

  borderBottom: "1px solid #e5e7eb", 

  background: "#f9fafb", 

  fontWeight: 600, 

  whiteSpace: "nowrap", 

}; 

 

const tableCell = { 

  padding: "10px 8px", 

  borderBottom: "1px solid #f3f4f6", 

  verticalAlign: "top", 

}; 

 

const tableCellEmpty = { 

  padding: 16, 

  textAlign: "center", 

  color: "#6b7280", 

}; 

 

const linkButtonStyle = { 

  display: "inline-flex", 

  alignItems: "center", 

  justifyContent: "center", 

  padding: "8px 12px", 

  borderRadius: 8, 

  background: "#fff", 

  border: "1px solid #d1d5db", 

  textDecoration: "none", 

  color: "#111827", 

  fontSize: 14, 

}; 