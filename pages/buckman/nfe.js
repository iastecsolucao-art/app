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

 

const STATUS = { 

  2: "Importada / Aguardando envio ao ERP", 

  1: "Enviada ao ERP / Aguardando retorno", 

  3: "Processada no ERP", 

}; 

 

function statusLabel(v) { 

  const n = Number(v); 

  return STATUS[n] || "-"; 

} 

 

function statusColor(v) { 

  const n = Number(v); 

 

  if (n === 2) { 

    return { 

      background: "#fff7d6", 

      color: "#8a6700", 

      border: "1px solid #f3d46b", 

    }; 

  } 

 

  if (n === 1) { 

    return { 

      background: "#dff1ff", 

      color: "#0b5cab", 

      border: "1px solid #8ec5ff", 

    }; 

  } 

 

  if (n === 3) { 

    return { 

      background: "#e6f7e8", 

      color: "#166534", 

      border: "1px solid #9ed8a6", 

    }; 

  } 

 

  return { 

    background: "#f3f4f6", 

    color: "#374151", 

    border: "1px solid #d1d5db", 

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

  const mapStatus = obj.map_status || null; 

 

  if (mapStatus) { 

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

 

    if ( 

      mapStatus === "PENDENTE_FORNECEDOR" || 

      mapStatus === "PENDENTE_ITEM" || 

      mapStatus === "PENDENTE" || 

      mapStatus === "PENDENTE_DESTINATARIO" 

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

 

  if (fornecedorOk === false || itensOk === false || pendencias.length > 0) { 

    return { 

      label: "De/Para pendente", 

      style: { 

        background: "#fff7d6", 

        color: "#8a6700", 

        border: "1px solid #f3d46b", 

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

 

  return ( 

    <div style={detailCardStyle}> 

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}> 

        <div> 

          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Detalhes da NF-e</h3> 

          <div><strong>Chave:</strong> {doc.chave_nfe || "-"}</div> 

          <div><strong>Número/Série:</strong> {doc.n_nf || "-"} / {doc.serie || "-"}</div> 

          <div><strong>Natureza:</strong> {doc.natureza_operacao || doc.nat_op || "-"}</div> 

          <div><strong>Status ERP:</strong> {statusLabel(doc.status_erp)}</div> 

          <div><strong>Status fila:</strong> {doc.queue_status || doc.fila_erp_status || "-"}</div> 

          <div><strong>Validação ERP:</strong> {doc.erp_validacao_status || doc.validacao_erp_status || "-"}</div> 

        </div> 

 

        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}> 

          <span style={{ ...statusColor(doc.status_erp), borderRadius: 999, padding: "6px 10px", fontSize: 12 }}> 

            {statusLabel(doc.status_erp)} 

          </span> 

 

          <span style={{ ...filaStatusColor(doc.queue_status || doc.fila_erp_status), borderRadius: 999, padding: "6px 10px", fontSize: 12 }}> 

            {doc.queue_status || doc.fila_erp_status || "Sem fila"} 

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

 

      // envia como string única; o front também filtra localmente por múltiplos termos 

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

      setImportMsg(`Erro ao enviar para ERP: ${e instanceof Error ? e.message : String(e)}`); 

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

 

      setImportMsg(data?.message || "NF marcada para reprocessamento."); 

      await loadDocs(); 

 

      if (selectedId === id) { 

        await verDetalhe(id); 

      } 

    } catch (e) { 

      setImportMsg(`Erro ao reprocessar ERP: ${e instanceof Error ? e.message : String(e)}`); 

    } finally { 

      setReprocessingId(null); 

    } 

  } 

 

async function baixarXml(id) {
  try {
    const res = await fetch(`/api/nfe/${id}/xml`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || data?.details || `Falha ao baixar XML (${res.status})`);
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
    setImportMsg(`Erro ao baixar XML: ${e instanceof Error ? e.message : String(e)}`);
  }
} 

  async function copiarChave(chave) { 

    try { 

      await navigator.clipboard.writeText(chave || ""); 

      setImportMsg("Chave copiada para a área de transferência."); 

    } catch { 

      setImportMsg("Não foi possível copiar a chave."); 

    } 

  } 

 

  function limparFiltros() { 

    const cleared = { 

      chave_nfe: "", 

      n_nf: "", 

      serie: "", 

      emitente: "", 

      destinatario: "", 

      natureza_operacao: "", 

      cfop: "", 

      status_erp: "", 

    }; 

 

    setFilters(cleared); 

    loadDocs(cleared); 

  } 

 

  async function onBuscar(e) { 

    e?.preventDefault?.(); 

    await loadDocs(); 

  } 

 

  return ( 

    <div style={{ padding: 20 }}> 

      <h1>NFe - Importar XML</h1> 

 

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}> 

        <input 

          type="file" 

          accept=".xml,text/xml,application/xml" 

          onChange={onPickFile} 

          disabled={loading} 

        /> 

        <button onClick={importar} disabled={loading || !xmlText}> 

          {loading ? "Importando..." : "Importar"} 

        </button> 

      </div> 

 

      <div style={{ marginTop: 10, fontSize: 14 }}> 

        {fileName && ( 

          <div> 

            <strong>Arquivo:</strong> {fileName} 

          </div> 

        )} 

        {chavePreview && ( 

          <div> 

            <strong>Chave (prévia):</strong> {chavePreview} 

          </div> 

        )} 

      </div> 

 

      {importMsg && ( 

        <p 

          style={{ 

            marginTop: 10, 

            fontWeight: "bold", 

            color: importMsg.toLowerCase().includes("erro") ? "red" : "green", 

          }} 

        > 

          {importMsg} 

        </p> 

      )} 

 

      {xmlText && ( 

        <details style={{ marginTop: 12 }}> 

          <summary>Ver XML (raw)</summary> 

          <pre 

            style={{ 

              whiteSpace: "pre-wrap", 

              background: "#f7f7f7", 

              padding: 10, 

              borderRadius: 8, 

              overflowX: "auto", 

            }} 

          > 

            {xmlText.slice(0, 20000)} 

            {xmlText.length > 20000 ? "\n\n... (cortado)" : ""} 

          </pre> 

        </details> 

      )} 

 

      <hr style={{ margin: "18px 0" }} /> 

 

      <h2>Documentos importados</h2> 

 

      <form onSubmit={onBuscar}> 

        <div 

          style={{ 

            display: "grid", 

            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 

            gap: 10, 

            marginBottom: 12, 

          }} 

        > 

          <input 

            placeholder="Chave NFe" 

            value={filters.chave_nfe} 

            onChange={(e) => setFilters((s) => ({ ...s, chave_nfe: e.target.value }))} 

          /> 

 

          <input 

            placeholder="Número" 

            value={filters.n_nf} 

            onChange={(e) => setFilters((s) => ({ ...s, n_nf: e.target.value }))} 

          /> 

 

          <input 

            placeholder="Série" 

            value={filters.serie} 

            onChange={(e) => setFilters((s) => ({ ...s, serie: e.target.value }))} 

          /> 

 

          <input 

            placeholder="Emitente" 

            value={filters.emitente} 

            onChange={(e) => setFilters((s) => ({ ...s, emitente: e.target.value }))} 

          /> 

 

          <input 

            placeholder="Destinatário" 

            value={filters.destinatario} 

            onChange={(e) => setFilters((s) => ({ ...s, destinatario: e.target.value }))} 

          /> 

 

          <input 

            placeholder="Natureza da operação (ex: transferência, venda)" 

            value={filters.natureza_operacao} 

            onChange={(e) => 

              setFilters((s) => ({ ...s, natureza_operacao: e.target.value })) 

            } 

          /> 

 

          <input 

            placeholder="CFOP (ex: 5102, 5152)" 

            value={filters.cfop} 

            onChange={(e) => setFilters((s) => ({ ...s, cfop: e.target.value }))} 

          /> 

 

          <select 

            value={filters.status_erp} 

            onChange={(e) => setFilters((s) => ({ ...s, status_erp: e.target.value }))} 

          > 

            <option value="">Todos os status</option> 

            <option value="1">Enviada ao ERP</option> 

            <option value="2">Importada</option> 

            <option value="3">Processada no ERP</option> 

          </select> 

        </div> 

 

        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}> 

          <button type="submit">Buscar</button> 

          <button type="button" onClick={limparFiltros}> 

            Limpar 

          </button> 

          <span style={{ fontSize: 12, color: "#6b7280", alignSelf: "center" }}> 

            Natureza e CFOP aceitam múltiplos termos separados por vírgula. 

          </span> 

        </div> 

      </form> 

 

      <div style={{ overflowX: "auto" }}> 

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}> 

          <thead> 

            <tr> 

              <th style={tableHead}>Chave</th> 

              <th style={tableHead}>Nº/Série</th> 

              <th style={tableHead}>Emitente</th> 

              <th style={tableHead}>Destinatário</th> 

              <th style={tableHead}>Natureza</th> 

              <th style={tableHead}>VNF</th> 

              <th style={tableHead}>Status ERP</th> 

              <th style={tableHead}>De/Para</th> 

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

                const mapInfo = mapStatusInfo(row); 

 

                return ( 

                  <tr 

                    key={row.id} 

                    style={{ 

                      background: selectedId === row.id ? "#f8fbff" : "#fff", 

                    }} 

                  > 

                    <td style={tableCell}>{row.chave_nfe || "-"}</td> 

                    <td style={tableCell}> 

                      {row.n_nf || "-"} / {row.serie || "-"} 

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

                          ...statusColor(row.status_erp), 

                          borderRadius: 999, 

                          padding: "4px 8px", 

                          fontSize: 12, 

                          display: "inline-block", 

                        }} 

                      > 

                        {statusLabel(row.status_erp)} 

                      </span> 

 

                      {row.queue_status ? ( 

                        <div style={{ marginTop: 6 }}> 

                          <span 

                            style={{ 

                              ...filaStatusColor(row.queue_status), 

                              borderRadius: 999, 

                              padding: "4px 8px", 

                              fontSize: 12, 

                              display: "inline-block", 

                            }} 

                          > 

                            {row.queue_status} 

                          </span> 

                        </div> 

                      ) : null} 

                    </td> 

                    <td style={tableCell}> 

                      <span 

                        style={{ 

                          ...mapInfo.style, 

                          borderRadius: 999, 

                          padding: "4px 8px", 

                          fontSize: 12, 

                          display: "inline-block", 

                        }} 

                      > 

                        {mapInfo.label} 

                      </span> 

                    </td> 

                    <td style={tableCell}>{formatDateBR(row.created_at)}</td> 

                    <td style={tableCell}> 

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}> 

                        <button onClick={() => verDetalhe(row.id)}>Ver detalhes</button> 

 

                        <button onClick={() => baixarXml(row.id)}>Baixar XML</button> 

 

                        <button 

                          onClick={async () => { 

                            await verDetalhe(row.id); 

                            setShowDanfePdf(true); 

                          }} 

                        > 

                          Ver DANFE 

                        </button> 

 

                        {Number(row.status_erp) === 2 ? ( 

                          <button 

                            onClick={() => enviarParaErp(row.id)} 

                            disabled={sendingErpId === row.id} 

                          > 

                            {sendingErpId === row.id ? "Enviando..." : "Enviar ERP"} 

                          </button> 

                        ) : null} 

 

                        {(Number(row.status_erp) === 1 || Number(row.status_erp) === 3) ? ( 

                          <button 

                            onClick={() => reprocessarErp(row.id)} 

                            disabled={reprocessingId === row.id} 

                          > 

                            {reprocessingId === row.id ? "Reprocessando..." : "Reprocessar ERP"} 

                          </button> 

                        ) : null} 

                      </div> 

                    </td> 

                  </tr> 

                ); 

              }) 

            )} 

          </tbody> 

        </table> 

      </div> 

 

      <div style={{ marginTop: 20 }}> 

        <DetailPanel 

          detail={detail} 

          loadingDetail={loadingDetail} 

          onDownloadXml={baixarXml} 

          onCopyKey={copiarChave} 

          onOpenDanfe={() => setShowDanfePdf(true)} 

        /> 

      </div> 

 

      {showDanfePdf && detail ? ( 

        <DanfePdfViewer 

          nfeId={detail?.document?.id} 

          chaveNfe={detail?.document?.chave_nfe} 

          onClose={() => setShowDanfePdf(false)} 

        /> 

      ) : null} 

    </div> 

  ); 

} 

 

const linkButtonStyle = { 

  display: "inline-flex", 

  alignItems: "center", 

  justifyContent: "center", 

  padding: "8px 12px", 

  borderRadius: 6, 

  textDecoration: "none", 

  border: "1px solid #d1d5db", 

  background: "#fff", 

  color: "#111827", 

  fontSize: 14, 

}; 

 

const tableHead = { 

  textAlign: "left", 

  borderBottom: "1px solid #d1d5db", 

  background: "#f9fafb", 

  padding: 10, 

  whiteSpace: "nowrap", 

}; 

 

const tableCell = { 

  borderBottom: "1px solid #e5e7eb", 

  padding: 10, 

  verticalAlign: "top", 

}; 

 

const tableCellEmpty = { 

  borderBottom: "1px solid #e5e7eb", 

  padding: 16, 

  textAlign: "center", 

}; 

 

const detailCardStyle = { 

  marginTop: 12, 

  border: "1px solid #e5e7eb", 

  borderRadius: 12, 

  padding: 16, 

  background: "#fff", 

}; 