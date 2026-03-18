import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 10;

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

function formatDateOnlyBR(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("pt-BR");
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
      style: badgeDanger,
    };
  }

  if (stage === "INTEGRADO") {
    return { label: "Integrado", style: badgeSuccess };
  }

  if (
    stage === "INTEGRADO_DIVERGENCIA" ||
    stage === "INTEGRADO_DIVERGENCIA_QTD" ||
    stage === "INTEGRADO_DIVERGENCIA_VALOR" ||
    stage === "INTEGRADO_DIVERGENCIA_QTD_VALOR"
  ) {
    return { label: "Integrado com divergência", style: badgeWarning };
  }

  if (stage === "ERRO") {
    return { label: "Erro na integração", style: badgeDanger };
  }

  if (stage === "DUPLICADA" || stage === "DUPLICADA_STAGE") {
    return { label: "NF duplicada", style: badgeNeutral };
  }

  if (stage === "PROCESSANDO") {
    return { label: "Processando ERP", style: badgeInfo };
  }

  if (stage === "PENDENTE") {
    return { label: "Pendente no ERP", style: badgeWarning };
  }

  if (
    validacao === "PENDENTE_ITEM" ||
    validacao === "PENDENTE_FORNECEDOR" ||
    validacao === "PENDENTE_DESTINATARIO"
  ) {
    return { label: "Validação pendente", style: badgeWarning };
  }

  if (statusErp === 5) return { label: "Integrado com divergência", style: badgeWarning };
  if (statusErp === 4) return { label: "Erro na integração", style: badgeDanger };
  if (statusErp === 3) return { label: "Processada no ERP", style: badgeSuccess };
  if (statusErp === 2) return { label: "Importada / Aguardando ERP", style: badgeWarning };
  if (statusErp === 1) return { label: "Enviada / Aguardando retorno", style: badgeInfo };

  return { label: "Pendente", style: badgeNeutral };
}

function filaStatusColor(v) {
  const s = String(v || "").toUpperCase();
  if (s === "PENDENTE") return badgeWarning;
  if (s === "PROCESSANDO") return badgeInfo;
  if (s === "INTEGRADO") return badgeSuccess;
  if (s === "ERRO" || s === "SEM_PEDIDO") return badgeDanger;
  return badgeNeutral;
}

function mapStatusInfo(rowOrDetail) {
  const obj = rowOrDetail || {};

  const fornecedorOk = obj.map_fornecedor_ok;
  const itensOk = obj.map_itens_ok;
  const pendencias = Array.isArray(obj.map_pendencias) ? obj.map_pendencias : [];
  const mapStatus = String(obj.map_status || obj.erp_validacao_status || "").toUpperCase().trim();
  const queueStatus = getQueueStatusText(obj);

  if (queueStatus === "SEM_PEDIDO") {
    return { label: "Sem pedido", style: badgeDanger };
  }

  if (mapStatus === "OK") {
    return { label: "De/Para OK", style: badgeSuccess };
  }

  if (
    mapStatus === "PENDENTE_ITEM" ||
    mapStatus === "PENDENTE_FORNECEDOR" ||
    mapStatus === "PENDENTE_DESTINATARIO" ||
    mapStatus === "PENDENTE" ||
    fornecedorOk === false ||
    itensOk === false ||
    pendencias.length > 0
  ) {
    return { label: "De/Para pendente", style: badgeWarning };
  }

  if (mapStatus === "ERRO") {
    return { label: "Erro no de/para", style: badgeDanger };
  }

  if (fornecedorOk === true && itensOk === true) {
    return { label: "De/Para OK", style: badgeSuccess };
  }

  return { label: "Não validado", style: badgeNeutral };
}

function buildNotaSituacao(row) {
  if (row?.cancelada === true || String(row?.situacao || "").toLowerCase() === "cancelada") {
    return "cancelada";
  }
  return "autorizada";
}

function MultiStatusSelector({ value, onChange }) {
  const options = [
    { value: "1", label: "Enviada / aguardando retorno" },
    { value: "2", label: "Importada / aguardando ERP" },
    { value: "3", label: "Processada no ERP" },
    { value: "4", label: "Erro na integração" },
    { value: "5", label: "Integrado com divergência" },
  ];

  function toggleStatus(statusValue) {
    if (value.includes(statusValue)) {
      onChange(value.filter((v) => v !== statusValue));
      return;
    }
    onChange([...value, statusValue]);
  }

  return (
    <div style={multiSelectWrapStyle}>
      {options.map((opt) => {
        const active = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggleStatus(opt.value)}
            style={{
              ...filterChipStyle,
              ...(active ? filterChipActiveStyle : {}),
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function DanfePdfViewer({ nfeId, chaveNfe, empresaId, onClose }) {
  if (!nfeId || !empresaId) return null;

  const pdfUrl = `/api/nfe/${nfeId}/danfe-pdf?empresa_id=${encodeURIComponent(empresaId)}`;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={modalHeaderStyle}>
          <strong>PDF da NF-e — {chaveNfe || nfeId}</strong>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={pdfUrl} target="_blank" rel="noreferrer" style={secondaryButtonStyle}>
              Abrir em nova guia
            </a>

            <a href={pdfUrl} download style={secondaryButtonStyle}>
              Baixar PDF
            </a>

            <button onClick={onClose} style={primaryButtonStyle}>
              Fechar
            </button>
          </div>
        </div>

        <div style={{ width: "100%", height: "85vh", background: "#0f172a" }}>
          <iframe
            src={pdfUrl}
            title={`PDF DANFE ${chaveNfe || nfeId}`}
            style={{ width: "100%", height: "100%", border: "none" }}
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
    return <div style={detailCardStyle}><strong>Carregando detalhes...</strong></div>;
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
          <h3 style={{ marginTop: 0, marginBottom: 10 }}>Detalhes da NF-e</h3>
          <div><strong>Chave:</strong> {doc.chave_nfe || "-"}</div>
          <div><strong>Número/Série:</strong> {doc.n_nf || "-"} / {doc.serie || "-"}</div>
          <div><strong>Emissão:</strong> {formatDateBR(doc.dh_emi)}</div>
          <div><strong>Natureza:</strong> {doc.natureza_operacao || doc.nat_op || "-"}</div>
          <div><strong>Situação:</strong> {buildNotaSituacao(doc)}</div>
          <div><strong>Status ERP:</strong> {erpStatusInfo.label}</div>
          <div><strong>Status fila:</strong> {queueStatusText}</div>
          <div><strong>Validação ERP:</strong> {doc.erp_validacao_status || "-"}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <span style={{ ...badgeBase, ...erpStatusInfo.style }}>{erpStatusInfo.label}</span>
          <span style={{ ...badgeBase, ...filaStatusColor(queueStatusText) }}>
            {queueStatusText || "Sem fila"}
          </span>
          <span style={{ ...badgeBase, ...mapInfo.style }}>{mapInfo.label}</span>
        </div>
      </div>

      <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div style={sectionMiniCard}>
          <h4 style={sectionMiniTitle}>Emitente</h4>
          <div><strong>Nome:</strong> {doc.xnome_emit || "-"}</div>
          <div><strong>CNPJ:</strong> {onlyDigits(doc.cnpj_emit) || "-"}</div>
          <div><strong>UF:</strong> {doc.uf_emit || "-"}</div>
          <div><strong>Município:</strong> {doc.municipio_emit || "-"}</div>
        </div>

        <div style={sectionMiniCard}>
          <h4 style={sectionMiniTitle}>Destinatário</h4>
          <div><strong>Nome:</strong> {doc.xnome_dest || "-"}</div>
          <div><strong>CNPJ:</strong> {onlyDigits(doc.cnpj_dest) || "-"}</div>
          <div><strong>UF:</strong> {doc.uf_dest || "-"}</div>
          <div><strong>Município:</strong> {doc.municipio_dest || "-"}</div>
        </div>

        <div style={sectionMiniCard}>
          <h4 style={sectionMiniTitle}>Totais</h4>
          <div><strong>Produtos:</strong> {moneyBR(doc.vprod)}</div>
          <div><strong>ICMS:</strong> {moneyBR(doc.vicms)}</div>
          <div><strong>PIS:</strong> {moneyBR(doc.vpis)}</div>
          <div><strong>COFINS:</strong> {moneyBR(doc.vcofins)}</div>
          <div><strong>Valor NF:</strong> {moneyBR(doc.vnf)}</div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => onCopyKey(doc.chave_nfe)} style={secondaryButtonStyle}>Copiar chave</button>
        <button onClick={() => onDownloadXml(doc.id)} style={secondaryButtonStyle}>Baixar XML</button>
        <button onClick={onOpenDanfe} style={primaryButtonStyle}>Visualizar DANFE</button>
      </div>

      {observacoes.length > 0 ? (
        <div style={{ marginTop: 18 }}>
          <h4 style={{ marginBottom: 8 }}>Observações</h4>
          <div style={obsBoxStyle}>
            {observacoes.map((obs, idx) => (
              <div key={idx} style={{ marginBottom: idx < observacoes.length - 1 ? 10 : 0 }}>
                {obs}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 18 }}>
        <h4>Itens ({items.length})</h4>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
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
                    <td style={tableCell}>{it.x_prod || it.xprod || "-"}</td>
                    <td style={tableCell}>{it.cfop || "-"}</td>
                    <td style={tableCell}>{it.ncm || "-"}</td>
                    <td style={tableCell}>{it.q_com ?? it.qcom ?? "-"}</td>
                    <td style={tableCell}>{moneyBR(it.v_prod ?? it.vprod)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h4>Pagamentos ({payments.length})</h4>
        {payments.length === 0 ? (
          <div>Nenhum pagamento encontrado.</div>
        ) : (
          payments.map((p) => (
            <div key={p.id} style={{ marginBottom: 6 }}>
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
  const [empresaId, setEmpresaId] = useState(null);
  const [empresaNome, setEmpresaNome] = useState("");
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const [xmlText, setXmlText] = useState("");
  const [fileName, setFileName] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [sendingErpId, setSendingErpId] = useState(null);
  const [reprocessingId, setReprocessingId] = useState(null);

  const [filters, setFilters] = useState({
    chave_nfe: "",
    mod:"",
    n_nf: "",
    serie: "",
    emitente: "",
    destinatario: "",
    natureza_operacao: "",
    cfop: "",
    status_erp: [],
    situacao_nota: "",
    dh_emi_ini: "",
    dh_emi_fim: "",
  });

  const [docs, setDocs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDanfePdf, setShowDanfePdf] = useState(false);

  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const chavePreview = useMemo(() => extractChaveQuick(xmlText), [xmlText]);
  const filteredDocs = docs;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        setLoadingSession(true);
        setSessionError("");

        const res = await fetch("/api/auth/session", {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            data?.error ||
              data?.details ||
              `Falha ao carregar sessão (${res.status})`
          );
        }

        const user = data?.user || {};
        const nextEmpresaId = Number(user?.empresa_id || 0);
        const nextEmpresaNome = String(user?.empresa_nome || "");

        if (!active) return;

        setEmpresaId(
          Number.isInteger(nextEmpresaId) && nextEmpresaId > 0
            ? nextEmpresaId
            : null
        );
        setEmpresaNome(nextEmpresaNome);
      } catch (e) {
        if (!active) return;

        setSessionError(e instanceof Error ? e.message : String(e));
        setEmpresaId(null);
        setEmpresaNome("");
      } finally {
        if (active) {
          setLoadingSession(false);
        }
      }
    }

    loadSession();

    return () => {
      active = false;
    };
  }, []);

  async function loadDocs(customFilters, customPage = page) {
    if (!empresaId) {
      setImportMsg("Empresa não identificada para consulta.");
      setDocs([]);
      setTotalRows(0);
      return;
    }

    try {
      setLoadingList(true);
      setImportMsg("");

      const f = customFilters || filters;
      const params = new URLSearchParams();

      params.set("empresa_id", String(empresaId));
      params.set("page", String(customPage));
      params.set("limit", String(PAGE_SIZE));

      if (f.chave_nfe?.trim()) params.set("chave_nfe", f.chave_nfe.trim());
      if (f.n_nf?.trim()) params.set("n_nf", f.n_nf.trim());
      if (f.serie?.trim()) params.set("serie", f.serie.trim());
      if (f.emitente?.trim()) params.set("emitente", f.emitente.trim());
      if (f.destinatario?.trim()) params.set("destinatario", f.destinatario.trim());
      if (f.natureza_operacao?.trim()) params.set("natureza_operacao", f.natureza_operacao.trim());
      if (f.cfop?.trim()) params.set("cfop", f.cfop.trim());
      if (Array.isArray(f.status_erp) && f.status_erp.length > 0) {
        params.set("status_erp", f.status_erp.join(","));
      }
      if (f.situacao_nota?.trim()) params.set("situacao_nota", f.situacao_nota.trim());
      if (f.dh_emi_ini) params.set("dh_emi_ini", f.dh_emi_ini);
      if (f.dh_emi_fim) params.set("dh_emi_fim", f.dh_emi_fim);
      if (f.mod?.trim()) params.set("mod", f.mod.trim());
      const res = await fetch(`/api/nfe?${params.toString()}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha ao carregar (${res.status})`);
      }

      const rows = Array.isArray(data.rows) ? data.rows : [];
      const total = Number(data.total ?? rows.length ?? 0);

      setDocs(rows);
      setTotalRows(total);
      setPage(customPage);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setImportMsg("Erro ao carregar documentos: " + msg);
      setDocs([]);
      setTotalRows(0);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    if (!loadingSession && empresaId) {
      loadDocs(filters, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, loadingSession]);

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

    if (!empresaId) {
      setImportMsg("Erro: empresa não identificada.");
      return;
    }

    setLoading(true);
    setImportMsg("");

    try {
      const res = await fetch("/api/nfe/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml: xmlText, empresa_id: empresaId }),
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
      await loadDocs(filters, 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setImportMsg("Erro ao importar: " + msg);
    } finally {
      setLoading(false);
    }
  }

  async function verDetalhe(id) {
    if (!empresaId) {
      setImportMsg("Empresa não identificada.");
      return;
    }

    try {
      setSelectedId(id);
      setDetail(null);
      setLoadingDetail(true);
      setImportMsg("");

      const params = new URLSearchParams();
      params.set("empresa_id", String(empresaId));

      const res = await fetch(`/api/nfe/${id}?${params.toString()}`);
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
    if (!empresaId) {
      setImportMsg("Empresa não identificada.");
      return;
    }

    try {
      setSendingErpId(id);
      setImportMsg("");

      const res = await fetch(`/api/nfe/${id}/enviar-erp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: empresaId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const pendencias = Array.isArray(data?.map_pendencias)
          ? data.map_pendencias.join(" | ")
          : "";
        throw new Error(data?.details || data?.error || pendencias || `Falha (${res.status})`);
      }

      setImportMsg(data?.message || "NF enviada para fila do ERP com sucesso.");
      await loadDocs(filters, page);

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
    if (!empresaId) {
      setImportMsg("Empresa não identificada.");
      return;
    }

    try {
      setReprocessingId(id);
      setImportMsg("");

      const res = await fetch(`/api/nfe/${id}/reprocessar-erp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: empresaId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.details || data?.error || `Falha (${res.status})`);
      }

      setImportMsg(data?.message || "NF enviada para reprocessamento.");
      await loadDocs(filters, page);

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
    if (!empresaId) {
      setImportMsg("Empresa não identificada.");
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("empresa_id", String(empresaId));

      const res = await fetch(`/api/nfe/${id}/xml?${params.toString()}`);
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

  function pesquisar() {
    setSelectedId(null);
    setDetail(null);
    setShowDanfePdf(false);
    loadDocs(filters, 1);
  }

  function limparFiltros() {
    const clear = {
      chave_nfe: "",
      n_nf: "",
      serie: "",
      emitente: "",
      destinatario: "",
      natureza_operacao: "",
      cfop: "",
      status_erp: [],
      situacao_nota: "",
      dh_emi_ini: "",
      dh_emi_fim: "",
      mod: "",
    };
    setFilters(clear);
    setSelectedId(null);
    setDetail(null);
    setShowDanfePdf(false);
    loadDocs(clear, 1);
  }

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages) return;
    loadDocs(filters, nextPage);
  }

  if (loadingSession) {
    return (
      <div style={pageStyle}>
        <div style={pageHeaderStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>NF-e</h1>
            <div style={{ color: "#64748b", marginTop: 4 }}>
              Gestão de notas por empresa, filtros avançados e integração ERP
            </div>
          </div>

          <div style={empresaBadgeStyle}>
            Empresa ID: <strong>-</strong>
          </div>
        </div>

        <div style={messageBoxStyle}>Carregando sessão...</div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div style={pageStyle}>
        <div style={pageHeaderStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>NF-e</h1>
            <div style={{ color: "#64748b", marginTop: 4 }}>
              Gestão de notas por empresa, filtros avançados e integração ERP
            </div>
          </div>

          <div style={empresaBadgeStyle}>
            Empresa ID: <strong>-</strong>
          </div>
        </div>

        <div style={messageBoxStyle}>
          Erro ao carregar sessão: {sessionError}
        </div>
      </div>
    );
  }

  if (!empresaId) {
    return (
      <div style={pageStyle}>
        <div style={pageHeaderStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>NF-e</h1>
            <div style={{ color: "#64748b", marginTop: 4 }}>
              Gestão de notas por empresa, filtros avançados e integração ERP
            </div>
          </div>

          <div style={empresaBadgeStyle}>
            Empresa ID: <strong>-</strong>
          </div>
        </div>

        <div style={messageBoxStyle}>
          Empresa não identificada. Selecione uma empresa antes de consultar as NF-es.
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>NF-e</h1>
          <div style={{ color: "#64748b", marginTop: 4 }}>
            Gestão de notas por empresa, filtros avançados e integração ERP
          </div>
        </div>

        <div style={empresaBadgeStyle}>
          Empresa: <strong>{empresaNome || "Sem nome"}</strong> | ID: <strong>{empresaId}</strong>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <h3 style={{ margin: 0 }}>Importar XML</h3>
        </div>

        <div style={toolbarStyle}>
          <input type="file" accept=".xml,text/xml" onChange={onPickFile} />
          <button onClick={importar} disabled={loading || !xmlText} style={primaryButtonStyle}>
            {loading ? "Importando..." : "Importar XML"}
          </button>
        </div>

        <div style={infoGridStyle}>
          <div><strong>Arquivo:</strong> {fileName || "-"}</div>
          <div><strong>Chave (preview):</strong> {chavePreview || "-"}</div>
        </div>

        {xmlText ? (
          <textarea
            value={xmlText}
            onChange={(e) => setXmlText(e.target.value)}
            rows={8}
            style={textareaStyle}
          />
        ) : null}
      </div>

      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <h3 style={{ margin: 0 }}>Filtros</h3>
        </div>

        <div style={filterGridStyle}>
          <input
            style={inputStyle}
            placeholder="Chave NF-e"
            value={filters.chave_nfe}
            onChange={(e) => setFilters((old) => ({ ...old, chave_nfe: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Número"
            value={filters.n_nf}
            onChange={(e) => setFilters((old) => ({ ...old, n_nf: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Série"
            value={filters.serie}
            onChange={(e) => setFilters((old) => ({ ...old, serie: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Emitente"
            value={filters.emitente}
            onChange={(e) => setFilters((old) => ({ ...old, emitente: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Destinatário"
            value={filters.destinatario}
            onChange={(e) => setFilters((old) => ({ ...old, destinatario: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Natureza"
            value={filters.natureza_operacao}
            onChange={(e) => setFilters((old) => ({ ...old, natureza_operacao: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="CFOP"
            value={filters.cfop}
            onChange={(e) => setFilters((old) => ({ ...old, cfop: e.target.value }))}
          />
          <select
  style={inputStyle}
  value={filters.mod}
  onChange={(e) =>
    setFilters((old) => ({ ...old, mod: e.target.value }))
  }
>
  <option value="">Tipo do documento</option>
  <option value="NFE">NF-e</option>
  <option value="NFSE">NFS-e</option>
</select>
          <select
            style={inputStyle}
            value={filters.situacao_nota}
            onChange={(e) => setFilters((old) => ({ ...old, situacao_nota: e.target.value }))}
          >
            <option value="">Situação da nota</option>
            <option value="autorizada">Autorizada</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <input
            style={inputStyle}
            type="date"
            value={filters.dh_emi_ini}
            onChange={(e) => setFilters((old) => ({ ...old, dh_emi_ini: e.target.value }))}
          />
          <input
            style={inputStyle}
            type="date"
            value={filters.dh_emi_fim}
            onChange={(e) => setFilters((old) => ({ ...old, dh_emi_fim: e.target.value }))}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#334155" }}>
            Status ERP (múltipla seleção)
          </div>
          <MultiStatusSelector
            value={filters.status_erp}
            onChange={(vals) => setFilters((old) => ({ ...old, status_erp: vals }))}
          />
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={pesquisar} style={primaryButtonStyle}>Pesquisar</button>
          <button onClick={limparFiltros} style={secondaryButtonStyle}>Limpar</button>
        </div>
      </div>

      {importMsg ? <div style={messageBoxStyle}>{importMsg}</div> : null}

      <div style={mainGridStyle}>
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div>
              <h3 style={{ margin: 0 }}>Documentos ({totalRows})</h3>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                Exibindo {filteredDocs.length} nesta página
              </div>
            </div>

            <div style={paginationInfoStyle}>
              Página {page} de {totalPages}
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={tableHead}>Chave</th>
                  <th style={tableHead}>Número</th>
                  <th style={tableHead}>Emissão</th>
                  <th style={tableHead}>Emitente</th>
                  <th style={tableHead}>Destinatário</th>
                  <th style={tableHead}>Natureza</th>
                  <th style={tableHead}>Situação</th>
                  <th style={tableHead}>VNF</th>
                  <th style={tableHead}>Status ERP</th>
                  <th style={tableHead}>De/Para</th>
                  <th style={tableHead}>Observação</th>
                  <th style={tableHead}>Ações</th>
                </tr>
              </thead>

              <tbody>
                {loadingList ? (
                  <tr>
                    <td colSpan={12} style={tableCellEmpty}>Carregando documentos...</td>
                  </tr>
                ) : filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={tableCellEmpty}>Nenhum documento encontrado.</td>
                  </tr>
                ) : (
                  filteredDocs.map((row) => {
                    const erpInfo = getErpStatusInfo(row);
                    const mapInfo = mapStatusInfo(row);
                    const situacaoNota = buildNotaSituacao(row);

                    return (
                      <tr
                        key={row.id}
                        style={{
                          background: selectedId === row.id ? "#f8fbff" : "#fff",
                        }}
                      >
                        <td style={tableCell}>
                          <div style={{ maxWidth: 220, wordBreak: "break-all" }}>
                            {row.chave_nfe || "-"}
                          </div>
                        </td>

                        <td style={tableCell}>
                          {row.n_nf || "-"} / {row.serie || "-"}
                        </td>

                        <td style={tableCell}>
                          {row.dh_emi ? formatDateOnlyBR(row.dh_emi) : "-"}
                        </td>

                        <td style={tableCell}>
                          <div>{row.xnome_emit || "-"}</div>
                          <div style={subTextStyle}>{onlyDigits(row.cnpj_emit) || "-"}</div>
                        </td>

                        <td style={tableCell}>
                          <div>{row.xnome_dest || "-"}</div>
                          <div style={subTextStyle}>{onlyDigits(row.cnpj_dest) || "-"}</div>
                        </td>

                        <td style={tableCell}>{row.natureza_operacao || row.nat_op || "-"}</td>

                        <td style={tableCell}>
                          <span
                            style={{
                              ...badgeBase,
                              ...(situacaoNota === "cancelada" ? badgeDanger : badgeSuccess),
                            }}
                          >
                            {situacaoNota}
                          </span>
                        </td>

                        <td style={tableCell}>{moneyBR(row.vnf)}</td>

                        <td style={tableCell}>
                          <span style={{ ...badgeBase, ...erpInfo.style }}>{erpInfo.label}</span>
                        </td>

                        <td style={tableCell}>
                          <span style={{ ...badgeBase, ...mapInfo.style }}>{mapInfo.label}</span>
                        </td>

                        <td
                          style={tableCell}
                          title={
                            row.infcpl ||
                            row.infadfisco ||
                            row.erp_stage_msg ||
                            row.erp_validacao_msg ||
                            row.mensagem_integracao ||
                            ""
                          }
                        >
                          {resumoObservacao(row)}
                        </td>

                        <td style={tableCell}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <button onClick={() => verDetalhe(row.id)} style={secondaryButtonStyle}>
                              Ver detalhes
                            </button>

                            <button onClick={() => baixarXml(row.id)} style={secondaryButtonStyle}>
                              Baixar XML
                            </button>

                            <button
                              style={secondaryButtonStyle}
                              onClick={() => {
                                if (!empresaId) {
                                  setImportMsg("Empresa não identificada.");
                                  return;
                                }

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
                              style={secondaryButtonStyle}
                            >
                              {reprocessingId === row.id ? "Reprocessando..." : "Reprocessar ERP"}
                            </button>

                            <button
                              onClick={() => enviarParaErp(row.id)}
                              disabled={sendingErpId === row.id}
                              style={primaryButtonStyle}
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

          <div style={paginationBarStyle}>
            <button
              onClick={() => goToPage(1)}
              disabled={page <= 1}
              style={secondaryButtonStyle}
            >
              « Primeira
            </button>

            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              style={secondaryButtonStyle}
            >
              ‹ Anterior
            </button>

            <span style={{ color: "#475569", fontSize: 14 }}>
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </span>

            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              style={secondaryButtonStyle}
            >
              Próxima ›
            </button>

            <button
              onClick={() => goToPage(totalPages)}
              disabled={page >= totalPages}
              style={secondaryButtonStyle}
            >
              Última »
            </button>
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
          empresaId={empresaId}
          onClose={() => setShowDanfePdf(false)}
        />
      ) : null}
    </div>
  );
}

const pageStyle = {
  padding: 20,
  background: "#f8fafc",
  minHeight: "100vh",
};

const pageHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 18,
};

const empresaBadgeStyle = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  borderRadius: 999,
  padding: "10px 14px",
  fontSize: 14,
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 18,
  marginBottom: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
};

const detailCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 18,
  minHeight: 320,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 14,
};

const toolbarStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const infoGridStyle = {
  marginTop: 12,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 10,
  fontSize: 13,
  color: "#475569",
};

const textareaStyle = {
  width: "100%",
  marginTop: 14,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  padding: 12,
  outline: "none",
  fontFamily: "monospace",
  fontSize: 13,
};

const filterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const inputStyle = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const multiSelectWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const filterChipStyle = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  borderRadius: 999,
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 13,
};

const filterChipActiveStyle = {
  background: "#dbeafe",
  border: "1px solid #93c5fd",
  color: "#1d4ed8",
  fontWeight: 600,
};

const messageBoxStyle = {
  marginBottom: 16,
  padding: 14,
  borderRadius: 14,
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  whiteSpace: "pre-wrap",
  color: "#334155",
};

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  gap: 18,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: 13,
};

const tableHead = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
  fontWeight: 700,
  whiteSpace: "nowrap",
  color: "#334155",
  position: "sticky",
  top: 0,
};

const tableCell = {
  padding: "12px 10px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
  color: "#0f172a",
};

const tableCellEmpty = {
  padding: 18,
  textAlign: "center",
  color: "#64748b",
};

const subTextStyle = {
  color: "#64748b",
  fontSize: 12,
  marginTop: 3,
};

const paginationBarStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  marginTop: 16,
};

const paginationInfoStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 999,
  padding: "8px 12px",
  color: "#475569",
  fontSize: 13,
};

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 12,
  background: "#2563eb",
  border: "1px solid #2563eb",
  color: "#fff",
  textDecoration: "none",
  fontSize: 14,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 12,
  background: "#fff",
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  textDecoration: "none",
  fontSize: 14,
  cursor: "pointer",
};

const badgeBase = {
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  display: "inline-block",
  fontWeight: 600,
};

const badgeSuccess = {
  background: "#ecfdf3",
  color: "#166534",
  border: "1px solid #bbf7d0",
};

const badgeWarning = {
  background: "#fffbeb",
  color: "#92400e",
  border: "1px solid #fde68a",
};

const badgeInfo = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
};

const badgeDanger = {
  background: "#fef2f2",
  color: "#b91c1c",
  border: "1px solid #fecaca",
};

const badgeNeutral = {
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #cbd5e1",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.55)",
  zIndex: 9999,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: 20,
  overflowY: "auto",
};

const modalStyle = {
  width: "100%",
  maxWidth: 1320,
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
  overflow: "hidden",
};

const modalHeaderStyle = {
  padding: "14px 18px",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  background: "#f8fafc",
};

const obsBoxStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
  whiteSpace: "pre-wrap",
  lineHeight: 1.5,
  fontSize: 13,
};

const sectionMiniCard = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
};

const sectionMiniTitle = {
  marginTop: 0,
  marginBottom: 10,
};