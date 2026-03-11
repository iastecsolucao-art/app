import { useEffect, useMemo, useState } from "react";

function onlyDigits(s) {
  return (s ?? "").toString().replace(/\D/g, "");
}

function extractChaveQuick(xmlText) {
  const m = (xmlText || "").match(/Id=['"]NFe(\d{44})['"]/i);
  return m ? m[1] : null;
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

function moneyBR(v) {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
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

const thStyle = {
  border: "1px solid #000",
  padding: 6,
  textAlign: "left",
  background: "#f3f3f3",
  fontWeight: 600,
};

const tdStyle = {
  border: "1px solid #000",
  padding: 6,
  verticalAlign: "top",
};

function DanfePreview({ detail, onClose, onDownloadXml, onCopyKey }) {
  const doc = detail?.document || {};
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const payments = Array.isArray(detail?.payments) ? detail.payments : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 24,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1120,
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #e5e5e5",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fafafa",
            position: "sticky",
            top: 0,
            zIndex: 2,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <strong>Pré-visualização DANFE</strong>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => onCopyKey(doc.chave_nfe)}>Copiar chave</button>
            <button onClick={() => onDownloadXml(doc.id)}>Baixar XML</button>
            <button onClick={onClose}>Fechar</button>
          </div>
        </div>

        <div style={{ padding: 20, color: "#111", fontSize: 13, lineHeight: 1.4 }}>
          <div style={{ border: "2px solid #000", padding: 12, marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div style={{ border: "1px solid #000", padding: 10 }}>
                <div style={{ fontWeight: "bold", fontSize: 16 }}>{doc.xnome_emit || "-"}</div>
                <div>CNPJ: {onlyDigits(doc.cnpj_emit) || "-"}</div>
                <div>UF: {doc.uf_emit || "-"}</div>
                <div>Município: {doc.municipio_emit || "-"}</div>
              </div>

              <div style={{ border: "1px solid #000", padding: 10 }}>
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>DANFE</div>
                <div>Documento Auxiliar da Nota Fiscal Eletrônica</div>
                <div style={{ marginTop: 8 }}>
                  <strong>NF-e:</strong> {doc.n_nf || "-"}
                </div>
                <div>
                  <strong>Série:</strong> {doc.serie || "-"}
                </div>
                <div>
                  <strong>Emissão:</strong>{" "}
                  {doc.dh_emi ? new Date(doc.dh_emi).toLocaleString("pt-BR") : "-"}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, border: "1px solid #000", padding: 10 }}>
              <div>
                <strong>Chave de Acesso:</strong> {doc.chave_nfe || "-"}
              </div>
              <div>
                <strong>Protocolo:</strong> {doc.nprot || "-"}
              </div>
              <div>
                <strong>Autorização:</strong> {doc.xmotivo || "-"}
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #000", padding: 10, marginBottom: 12 }}>
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>Destinatário / Remetente</div>
            <div>
              <strong>Nome:</strong> {doc.xnome_dest || "-"}
            </div>
            <div>
              <strong>CNPJ:</strong> {onlyDigits(doc.cnpj_dest) || "-"}
            </div>
            <div>
              <strong>UF:</strong> {doc.uf_dest || "-"}
            </div>
            <div>
              <strong>Município:</strong> {doc.municipio_dest || "-"}
            </div>
          </div>

          <div style={{ border: "1px solid #000", padding: 10, marginBottom: 12 }}>
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>Itens da Nota</div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Item</th>
                    <th style={thStyle}>Descrição</th>
                    <th style={thStyle}>NCM</th>
                    <th style={thStyle}>CFOP</th>
                    <th style={thStyle}>Qtd</th>
                    <th style={thStyle}>Un</th>
                    <th style={thStyle}>Vlr Unit.</th>
                    <th style={thStyle}>Vlr Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td style={{ ...tdStyle, textAlign: "center" }} colSpan={8}>
                        Nenhum item encontrado.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => (
                      <tr key={it.id}>
                        <td style={tdStyle}>{it.n_item || "-"}</td>
                        <td style={tdStyle}>{it.xprod || "-"}</td>
                        <td style={tdStyle}>{it.ncm || "-"}</td>
                        <td style={tdStyle}>{it.cfop || "-"}</td>
                        <td style={tdStyle}>{it.qcom ?? "-"}</td>
                        <td style={tdStyle}>{it.ucom || "-"}</td>
                        <td style={tdStyle}>{moneyBR(it.vuncom)}</td>
                        <td style={tdStyle}>{moneyBR(it.vprod)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div style={{ border: "1px solid #000", padding: 10 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Informações complementares</div>
              <div>{doc.infcpl || "-"}</div>

              {doc.infadfisco ? (
                <div style={{ marginTop: 10 }}>
                  <strong>Informações ao Fisco:</strong>
                  <div>{doc.infadfisco}</div>
                </div>
              ) : null}
            </div>

            <div style={{ border: "1px solid #000", padding: 10 }}>
              <div style={{ fontWeight: "bold", marginBottom: 6 }}>Totais</div>
              <div>
                <strong>Valor produtos:</strong> {moneyBR(doc.vprod)}
              </div>
              <div>
                <strong>Base ICMS:</strong> {moneyBR(doc.vbc)}
              </div>
              <div>
                <strong>ICMS:</strong> {moneyBR(doc.vicms)}
              </div>
              <div>
                <strong>PIS:</strong> {moneyBR(doc.vpis)}
              </div>
              <div>
                <strong>COFINS:</strong> {moneyBR(doc.vcofins)}
              </div>
              <div style={{ marginTop: 8, fontSize: 15 }}>
                <strong>Valor NF:</strong> {moneyBR(doc.vnf)}
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid #000", padding: 10, marginTop: 12 }}>
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>Pagamentos</div>

            {payments.length === 0 ? (
              <div>Nenhum pagamento encontrado.</div>
            ) : (
              payments.map((p) => (
                <div key={p.id} style={{ marginBottom: 4 }}>
                  <strong>tPag:</strong> {p.tpag || "-"} | <strong>vPag:</strong> {moneyBR(p.vpag)}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NfeImport() {
  const [xmlText, setXmlText] = useState("");
  const [fileName, setFileName] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingErpId, setSendingErpId] = useState(null);

  const [filters, setFilters] = useState({
    chave_nfe: "",
    n_nf: "",
    serie: "",
    emitente: "",
    destinatario: "",
    status_erp: "",
  });

  const [docs, setDocs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDanfe, setShowDanfe] = useState(false);

  const chavePreview = useMemo(() => extractChaveQuick(xmlText), [xmlText]);

  async function loadDocs(customFilters) {
    try {
      const f = customFilters || filters;
      const params = new URLSearchParams();

      if (f.chave_nfe) params.set("chave_nfe", f.chave_nfe);
      if (f.n_nf) params.set("n_nf", f.n_nf);
      if (f.serie) params.set("serie", f.serie);
      if (f.emitente) params.set("emitente", f.emitente);
      if (f.destinatario) params.set("destinatario", f.destinatario);
      if (f.status_erp) params.set("status_erp", f.status_erp);

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

  function baixarXml(id) {
    window.open(`/api/nfe/${id}/xml`, "_blank");
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
      status_erp: "",
    };

    setFilters(cleared);
    loadDocs(cleared);
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 8,
          alignItems: "end",
          marginBottom: 12,
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Chave NFe</label>
          <input
            value={filters.chave_nfe}
            onChange={(e) => setFilters((prev) => ({ ...prev, chave_nfe: e.target.value }))}
            placeholder="Digite a chave"
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Número</label>
          <input
            value={filters.n_nf}
            onChange={(e) => setFilters((prev) => ({ ...prev, n_nf: e.target.value }))}
            placeholder="Ex: 2540"
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Série</label>
          <input
            value={filters.serie}
            onChange={(e) => setFilters((prev) => ({ ...prev, serie: e.target.value }))}
            placeholder="Ex: 1"
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Emitente</label>
          <input
            value={filters.emitente}
            onChange={(e) => setFilters((prev) => ({ ...prev, emitente: e.target.value }))}
            placeholder="Nome ou CNPJ do emitente"
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Destinatário</label>
          <input
            value={filters.destinatario}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, destinatario: e.target.value }))
            }
            placeholder="Nome ou CNPJ do destinatário"
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Status ERP</label>
          <select
            value={filters.status_erp}
            onChange={(e) => setFilters((prev) => ({ ...prev, status_erp: e.target.value }))}
            style={{ width: "100%", padding: 6 }}
          >
            <option value="">Todos</option>
            <option value="2">2 - {STATUS[2]}</option>
            <option value="1">1 - {STATUS[1]}</option>
            <option value="3">3 - {STATUS[3]}</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => loadDocs()}>Buscar</button>
          <button type="button" onClick={limparFiltros}>
            Limpar
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 760px" }}>
          {docs.length === 0 ? (
            <p>Nenhum documento encontrado.</p>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f7f7f7" }}>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                      Chave
                    </th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                      Nº/Série
                    </th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                      Emitente
                    </th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                      Destinatário
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      VNF
                    </th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                      Status ERP
                    </th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                      De/Para
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      Criado em
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {docs.map((d) => {
                    const st = Number(d.status_erp ?? 2);
                    const mapInfo = mapStatusInfo(d);
                    const podeEnviar =
                    st === 2 ;
                    return (
                      <tr
                        key={d.id}
                        style={{ background: selectedId === d.id ? "#f3f8ff" : "white" }}
                      >
                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid #f0f0f0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {d.chave_nfe}
                        </td>

                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid #f0f0f0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {d.n_nf || "-"} / {d.serie || "-"}
                        </td>

                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                          {d.xnome_emit || "-"} ({onlyDigits(d.cnpj_emit) || "-"})
                        </td>

                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                          {d.xnome_dest || "-"} ({onlyDigits(d.cnpj_dest) || "-"})
                        </td>

                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid #f0f0f0",
                            textAlign: "right",
                          }}
                        >
                          {moneyBR(d.vnf)}
                        </td>

                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid #f0f0f0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <select value={st} disabled style={{ padding: 4, minWidth: 240 }}>
                            <option value={2}>2 - {STATUS[2]}</option>
                            <option value={1}>1 - {STATUS[1]}</option>
                            <option value={3}>3 - {STATUS[3]}</option>
                          </select>

                          <div
                            style={{
                              fontSize: 12,
                              marginTop: 6,
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: 999,
                              fontWeight: 600,
                              ...statusColor(st),
                            }}
                          >
                            {statusLabel(st)}
                          </div>
                        </td>

                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                          <div
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                              ...mapInfo.style,
                            }}
                            title={
                              Array.isArray(d.map_pendencias) && d.map_pendencias.length
                                ? d.map_pendencias.join(" | ")
                                : mapInfo.label
                            }
                          >
                            {mapInfo.label}
                          </div>

                          {Array.isArray(d.map_pendencias) && d.map_pendencias.length > 0 ? (
                            <div style={{ marginTop: 4, fontSize: 11, color: "#7c2d12" }}>
                              {d.map_pendencias[0]}
                            </div>
                          ) : null}
                        </td>

                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid #f0f0f0",
                            textAlign: "right",
                          }}
                        >
                          {d.created_at ? new Date(d.created_at).toLocaleString("pt-BR") : ""}
                        </td>

                        <td
                          style={{
                            padding: 8,
                            borderBottom: "1px solid #f0f0f0",
                            textAlign: "right",
                          }}
                        >
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            <button onClick={() => verDetalhe(d.id)}>Ver detalhes</button>

                            <button
                              onClick={() => enviarParaErp(d.id)}
                              disabled={!podeEnviar || sendingErpId === d.id}
                              style={{
                                opacity: !podeEnviar || sendingErpId === d.id ? 0.6 : 1,
                                cursor: !podeEnviar || sendingErpId === d.id ? "not-allowed" : "pointer",
                              }}
                              title={
                                !podeEnviar
                                  ? "Só é possível enviar quando o status estiver 2 e o de/para estiver OK."
                                  : "Enviar para fila do ERP"
                              }
                            >
                              {sendingErpId === d.id ? "Enviando..." : "Enviar ERP"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ flex: "1 1 520px" }}>
          {loadingDetail ? (
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <p>Carregando detalhes...</p>
            </div>
          ) : detail ? (
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Detalhes</h3>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={() => setShowDanfe(true)}>Visualizar DANFE</button>
                <button onClick={() => baixarXml(detail.document?.id)}>Baixar XML</button>
                <button onClick={() => copiarChave(detail.document?.chave_nfe)}>
                  Copiar chave
                </button>

                <button
                  onClick={() => enviarParaErp(detail.document?.id)}
                  disabled={
                    !detail.document?.id ||
                    sendingErpId === detail.document?.id ||
                    Number(detail.document?.status_erp ?? 2) !== 2 ||
                    !(
                      detail.document?.map_status === "OK" ||
                      (detail.document?.map_fornecedor_ok === true &&
                        detail.document?.map_itens_ok === true)
                    )
                  }
                  style={{
                    opacity:
                      !detail.document?.id ||
                      sendingErpId === detail.document?.id ||
                      Number(detail.document?.status_erp ?? 2) !== 2 ||
                      !(
                        detail.document?.map_status === "OK" ||
                        (detail.document?.map_fornecedor_ok === true &&
                          detail.document?.map_itens_ok === true)
                      )
                        ? 0.6
                        : 1,
                    cursor:
                      !detail.document?.id ||
                      sendingErpId === detail.document?.id ||
                      Number(detail.document?.status_erp ?? 2) !== 2 ||
                      !(
                        detail.document?.map_status === "OK" ||
                        (detail.document?.map_fornecedor_ok === true &&
                          detail.document?.map_itens_ok === true)
                      )
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {sendingErpId === detail.document?.id ? "Enviando..." : "Enviar ERP"}
                </button>
              </div>

              <div style={{ fontSize: 14 }}>
                <div>
                  <strong>Chave:</strong> {detail.document?.chave_nfe || "-"}
                </div>
                <div>
                  <strong>Número:</strong> {detail.document?.n_nf || "-"} <strong>Série:</strong>{" "}
                  {detail.document?.serie || "-"}
                </div>
                <div>
                  <strong>Emitente:</strong> {detail.document?.xnome_emit || "-"}
                </div>
                <div>
                  <strong>Destinatário:</strong> {detail.document?.xnome_dest || "-"}
                </div>
                <div>
                  <strong>Emissão:</strong>{" "}
                  {detail.document?.dh_emi
                    ? new Date(detail.document.dh_emi).toLocaleString("pt-BR")
                    : "-"}
                </div>
                <div>
                  <strong>VNF:</strong> {moneyBR(detail.document?.vnf)}
                </div>

                <div style={{ marginTop: 8 }}>
                  <strong>Status ERP:</strong>{" "}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontWeight: 600,
                      ...statusColor(detail.document?.status_erp ?? 2),
                    }}
                  >
                    {Number(detail.document?.status_erp ?? 2)} -{" "}
                    {statusLabel(detail.document?.status_erp ?? 2)}
                  </span>
                </div>

                <div style={{ marginTop: 8 }}>
                  {(() => {
                    const mapInfo = mapStatusInfo(detail.document);
                    return (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 999,
                          fontWeight: 600,
                          ...mapInfo.style,
                        }}
                      >
                        {mapInfo.label}
                      </span>
                    );
                  })()}
                </div>

                {Array.isArray(detail.document?.map_pendencias) &&
                detail.document.map_pendencias.length > 0 ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 8,
                      background: "#fff7d6",
                      border: "1px solid #f3d46b",
                      color: "#8a6700",
                    }}
                  >
                    <strong>Pendências de de/para:</strong>
                    <ul style={{ margin: "8px 0 0 18px" }}>
                      {detail.document.map_pendencias.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <h4 style={{ marginBottom: 8 }}>Itens ({detail.items?.length || 0})</h4>
              <div
                style={{
                  maxHeight: 260,
                  overflow: "auto",
                  border: "1px solid #eee",
                  borderRadius: 6,
                }}
              >
                {(detail.items || []).length === 0 ? (
                  <div style={{ padding: 8, color: "#666" }}>Nenhum item encontrado.</div>
                ) : (
                  (detail.items || []).map((it) => (
                    <div key={it.id} style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                      <div>
                        <strong>{it.n_item}.</strong> {it.xprod || "-"}
                      </div>
                      <div style={{ fontSize: 12, color: "#555" }}>
                        cProd: {it.cprod || "-"} | NCM: {it.ncm || "-"} | CFOP: {it.cfop || "-"}
                      </div>
                      <div style={{ fontSize: 12, color: "#555" }}>
                        Qtd: {it.qcom ?? "-"} {it.ucom || ""} | Unit: {moneyBR(it.vuncom)} | Total:{" "}
                        {moneyBR(it.vprod)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <h4 style={{ marginBottom: 8, marginTop: 16 }}>
                Pagamentos ({detail.payments?.length || 0})
              </h4>
              <div
                style={{
                  maxHeight: 180,
                  overflow: "auto",
                  border: "1px solid #eee",
                  borderRadius: 6,
                }}
              >
                {(detail.payments || []).length === 0 ? (
                  <div style={{ padding: 8, color: "#666" }}>Nenhum pagamento encontrado.</div>
                ) : (
                  (detail.payments || []).map((p) => (
                    <div key={p.id} style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                      <div>
                        <strong>tPag:</strong> {p.tpag || "-"} | <strong>vPag:</strong>{" "}
                        {moneyBR(p.vpag)}
                      </div>
                      <div style={{ fontSize: 12, color: "#555" }}>
                        Card CNPJ: {onlyDigits(p.card_cnpj) || "-"} | Bandeira:{" "}
                        {p.card_tband || "-"} | Integração: {p.card_tpintegra || "-"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p>Selecione um documento e clique em “Ver detalhes”.</p>
          )}
        </div>
      </div>

      {showDanfe && detail ? (
        <DanfePreview
          detail={detail}
          onClose={() => setShowDanfe(false)}
          onDownloadXml={baixarXml}
          onCopyKey={copiarChave}
        />
      ) : null}
    </div>
  );
}