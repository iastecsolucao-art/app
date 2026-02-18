import { useEffect, useMemo, useState } from "react";

function onlyDigits(s) {
  return (s ?? "").toString().replace(/\D/g, "");
}

// preview simples no front: tenta extrair a chave do atributo Id
function extractChaveQuick(xmlText) {
  const m = xmlText.match(/Id="NFe(\d{44})"/);
  return m ? m[1] : null;
}

export default function NfeImport() {
  const [xmlText, setXmlText] = useState("");
  const [fileName, setFileName] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [docs, setDocs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  const chavePreview = useMemo(() => extractChaveQuick(xmlText), [xmlText]);

  async function loadDocs() {
    const res = await fetch(`/api/nfe?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (res.ok) setDocs(Array.isArray(data.rows) ? data.rows : []);
  }

  useEffect(() => {
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (!res.ok) throw new Error(data?.error || data?.details || `Falha (${res.status})`);

      setImportMsg(`${data.message} | Chave: ${data.chave_nfe} | Itens: ${data.itens} | Pag: ${data.pagamentos}`);
      await loadDocs();
    } catch (e) {
      setImportMsg("Erro ao importar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function verDetalhe(id) {
    setSelectedId(id);
    setDetail(null);
    const res = await fetch(`/api/nfe/${id}`);
    const data = await res.json();
    if (res.ok) setDetail(data);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>NFe - Importar XML</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input type="file" accept=".xml,text/xml" onChange={onPickFile} disabled={loading} />
        <button onClick={importar} disabled={loading || !xmlText}>
          {loading ? "Importando..." : "Importar"}
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 14 }}>
        {fileName && <div><strong>Arquivo:</strong> {fileName}</div>}
        {chavePreview && <div><strong>Chave (prévia):</strong> {chavePreview}</div>}
      </div>

      {importMsg && (
        <p style={{ marginTop: 10, fontWeight: "bold", color: importMsg.includes("Erro") ? "red" : "green" }}>
          {importMsg}
        </p>
      )}

      {xmlText && (
        <details style={{ marginTop: 12 }}>
          <summary>Ver XML (raw)</summary>
          <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 10, borderRadius: 8 }}>
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
        <button onClick={loadDocs}>Buscar</button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 520px" }}>
          {docs.length === 0 ? (
            <p>Nenhum documento encontrado.</p>
          ) : (
            <div style={{ border: "1px solid #ddd", borderRadius: 8 }}>
              {docs.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: 10,
                    borderBottom: "1px solid #eee",
                    background: selectedId === d.id ? "#f3f8ff" : "white",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div><strong>Chave:</strong> {d.chave_nfe}</div>
                      <div>
                        <strong>Nº:</strong> {d.n_nf || "-"} <strong>Série:</strong> {d.serie || "-"}
                      </div>
                      <div>
                        <strong>Emit:</strong> {d.xnome_emit || "-"} ({onlyDigits(d.cnpj_emit) || "-"})
                      </div>
                      <div>
                        <strong>Dest:</strong> {d.xnome_dest || "-"} ({onlyDigits(d.cnpj_dest) || "-"})
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div><strong>VNF:</strong> {d.vnf ?? "-"}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {d.created_at ? new Date(d.created_at).toLocaleString() : ""}
                      </div>
                      <button onClick={() => verDetalhe(d.id)} style={{ marginTop: 6 }}>
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: "1 1 520px" }}>
          {detail ? (
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>Detalhes</h3>

              <div style={{ fontSize: 14 }}>
                <div><strong>Chave:</strong> {detail.document.chave_nfe}</div>
                <div><strong>Número:</strong> {detail.document.n_nf} <strong>Série:</strong> {detail.document.serie}</div>
                <div><strong>Emissão:</strong> {detail.document.dh_emi ? new Date(detail.document.dh_emi).toLocaleString() : "-"}</div>
                <div><strong>VNF:</strong> {detail.document.vnf ?? "-"}</div>
              </div>

              <h4>Itens ({detail.items.length})</h4>
              <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #eee", borderRadius: 6 }}>
                {detail.items.map((it) => (
                  <div key={it.id} style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                    <div><strong>{it.n_item}.</strong> {it.xprod}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      cProd: {it.cprod || "-"} | NCM: {it.ncm || "-"} | CFOP: {it.cfop || "-"}
                    </div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      Qtd: {it.qcom ?? "-"} {it.ucom || ""} | Unit: {it.vuncom ?? "-"} | Total: {it.vprod ?? "-"}
                    </div>
                  </div>
                ))}
              </div>

              <h4>Pagamentos ({detail.payments.length})</h4>
              <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid #eee", borderRadius: 6 }}>
                {detail.payments.map((p) => (
                  <div key={p.id} style={{ padding: 8, borderBottom: "1px solid #f0f0f0" }}>
                    <div><strong>tPag:</strong> {p.tpag || "-"} | <strong>vPag:</strong> {p.vpag ?? "-"}</div>
                    <div style={{ fontSize: 12, color: "#555" }}>
                      Card CNPJ: {onlyDigits(p.card_cnpj) || "-"} | Bandeira: {p.card_tband || "-"}
                    </div>
                  </div>
                ))}
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
