import { useEffect, useMemo, useState } from "react";

function onlyDigits(s) {
  return (s ?? "").toString().replace(/\D/g, "");
}

function extractChaveQuick(xmlText) {
  const m = (xmlText || "").match(/Id=['"]NFe(\d{44})['"]/i);
  return m ? m[1] : null;
}

const STATUS = {
  1: "Enviado ao ERP",
  2: "Aguardando processamento",
  3: "Processado no ERP",
};

function statusLabel(v) {
  const n = Number(v);
  return STATUS[n] || "-";
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

export default function NfeImport() {
  const [xmlText, setXmlText] = useState("");
  const [fileName, setFileName] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [docs, setDocs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const chavePreview = useMemo(() => extractChaveQuick(xmlText), [xmlText]);

  async function loadDocs() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (statusFilter) params.set("status_erp", statusFilter);

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

  async function atualizarStatus(id, novoStatus) {
    const res = await fetch(`/api/nfe/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status_erp: Number(novoStatus) }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || data?.details || `Falha (${res.status})`);

    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status_erp: data.status_erp } : d))
    );

    setDetail((prev) =>
      prev?.document?.id === id
        ? { ...prev, document: { ...prev.document, status_erp: data.status_erp } }
        : prev
    );
  }

  function baixarXml(id) {
    window.open(`/api/nfe/${id}/xml`, "_blank");
  }

  function visualizarDanfe(id) {
    window.open(`/api/nfe/${id}/danfe`, "_blank");
  }

  async function copiarChave(chave) {
    try {
      await navigator.clipboard.writeText(chave || "");
      setImportMsg("Chave copiada para a área de transferência.");
    } catch {
      setImportMsg("Não foi possível copiar a chave.");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>NFe - Importar XML</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input type="file" accept=".xml,text/xml,application/xml" onChange={onPickFile} disabled={loading} />
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

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por chave, número, emitente, destinatário..."
          style={{ width: 420, maxWidth: "100%", padding: 6 }}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: 6 }}>
          <option value="">Status: todos</option>
          <option value="1">1 - {STATUS[1]}</option>
          <option value="2">2 - {STATUS[2]}</option>
          <option value="3">3 - {STATUS[3]}</option>
        </select>

        <button onClick={loadDocs}>Buscar</button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 720px" }}>
          {docs.length === 0 ? (
            <p>Nenhum documento encontrado.</p>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f7f7f7" }}>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Chave</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Nº/Série</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Emitente</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Destinatário</th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>VNF</th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Status ERP</th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>Criado em</th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {docs.map((d) => {
                    const st = Number(d.status_erp ?? 2);

                    return (
                      <tr key={d.id} style={{ background: selectedId === d.id ? "#f3f8ff" : "white" }}>
                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" }}>
                          {d.chave_nfe}
                        </td>

                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" }}>
                          {d.n_nf || "-"} / {d.serie || "-"}
                        </td>

                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                          {d.xnome_emit || "-"} ({onlyDigits(d.cnpj_emit) || "-"})
                        </td>

                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                          {d.xnome_dest || "-"} ({onlyDigits(d.cnpj_dest) || "-"})
                        </td>

                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>
                          {moneyBR(d.vnf)}
                        </td>

                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", whiteSpace: "nowrap" }}>
                          <select
                            value={st}
                            onChange={(e) =>
                              atualizarStatus(d.id, e.target.value).catch((err) => {
                                alert(err.message);
                              })
                            }
                            style={{ padding: 4 }}
                          >
                            <option value={1}>1 - {STATUS[1]}</option>
                            <option value={2}>2 - {STATUS[2]}</option>
                            <option value={3}>3 - {STATUS[3]}</option>
                          </select>

                          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{statusLabel(st)}</div>
                        </td>

                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>
                          {d.created_at ? new Date(d.created_at).toLocaleString("pt-BR") : ""}
                        </td>

                        <td style={{ padding: 8, borderBottom: "1px solid #f0f0f0", textAlign: "right" }}>
                          <button onClick={() => verDetalhe(d.id)}>Ver detalhes</button>
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
                <button onClick={() => visualizarDanfe(detail.document?.id)}>Visualizar DANFE</button>
                <button onClick={() => baixarXml(detail.document?.id)}>Baixar XML</button>
                <button onClick={() => copiarChave(detail.document?.chave_nfe)}>Copiar chave</button>
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
                  {detail.document?.dh_emi ? new Date(detail.document.dh_emi).toLocaleString("pt-BR") : "-"}
                </div>
                <div>
                  <strong>VNF:</strong> {moneyBR(detail.document?.vnf)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Status ERP:</strong> {Number(detail.document?.status_erp ?? 2)} -{" "}
                  {statusLabel(detail.document?.status_erp ?? 2)}
                </div>
              </div>

              <h4 style={{ marginBottom: 8 }}>Itens ({detail.items?.length || 0})</h4>
              <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #eee", borderRadius: 6 }}>
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

              <h4 style={{ marginBottom: 8, marginTop: 16 }}>Pagamentos ({detail.payments?.length || 0})</h4>
              <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid #eee", borderRadius: 6 }}>
                {(detail.payments || []).length === 0 ? (
                  <div style={{ padding: 8, color: "#666" }}>Nenhum pagamento encontrado.</div>
                ) : (
                  (detail.payments || []).map((p) => (
                    <div key={p.id} style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                      <div>
                        <strong>tPag:</strong> {p.tpag || "-"} | <strong>vPag:</strong> {moneyBR(p.vpag)}
                      </div>
                      <div style={{ fontSize: 12, color: "#555" }}>
                        Card CNPJ: {onlyDigits(p.card_cnpj) || "-"} | Bandeira: {p.card_tband || "-"} | Integração:{" "}
                        {p.card_tpintegra || "-"}
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
    </div>
  );
}