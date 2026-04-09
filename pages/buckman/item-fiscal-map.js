import { getSession, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

const initialForm = {
  id: null,
  empresa_id: "",
  cfop_origem: "",
  natureza_origem: "",
  cst_origem: "",
  serie_origem: "",
  cfop_destino: "",
  natureza_destino: "",
  cst_destino: "",
  especie_serie_destino: "",
  ativo: true,
  observacao: "",
};

function FiscalDeParaPage({ empresaId }) {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    cfop_origem: "",
    cfop_destino: "",
  });

  const [form, setForm] = useState({
    ...initialForm,
    empresa_id: empresaId || "",
  });

  const selectedIndex = useMemo(() => {
    if (!form.id) return -1;
    return rows.findIndex((r) => r.id === form.id);
  }, [rows, form.id]);

  async function loadRows(customFilters) {
    if (!empresaId) {
      setMsg("Empresa não identificada. Selecione uma empresa antes de consultar os de/para fiscais.");
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      setMsg("");

      const f = customFilters || filters;
      const params = new URLSearchParams();

      params.set("empresa_id", String(empresaId));
      if (f.q) params.set("q", f.q);
      if (f.cfop_origem) params.set("cfop_origem", f.cfop_origem);
      if (f.cfop_destino) params.set("cfop_destino", f.cfop_destino);

      const res = await fetch(`/api/de-para-fiscal?${params.toString()}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      }

      const nextRows = Array.isArray(data.rows) ? data.rows : [];
      setRows(nextRows);

      if (form.id) {
        const updated = nextRows.find((r) => r.id === form.id);
        if (!updated) {
          setForm({
            ...initialForm,
            empresa_id: empresaId || "",
          });
        }
      }
    } catch (e) {
      setMsg(`Erro ao carregar: ${e instanceof Error ? e.message : String(e)}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (empresaId) {
      setForm((prev) => ({
        ...prev,
        empresa_id: empresaId,
      }));
      loadRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  function limparFormulario() {
    setForm({
      ...initialForm,
      empresa_id: empresaId || "",
    });
    setMsg("");
  }

  function preencherFormulario(data) {
    setForm({
      id: data.id ?? null,
      empresa_id: data.empresa_id ?? empresaId ?? "",
      cfop_origem: data.cfop_origem || "",
      natureza_origem: data.natureza_origem || "",
      cst_origem: data.cst_origem || "",
      serie_origem: data.serie_origem || "",
      cfop_destino: data.cfop_destino || "",
      natureza_destino: data.natureza_destino || "",
      cst_destino: data.cst_destino || "",
      especie_serie_destino: data.especie_serie_destino || "",
      ativo: data.ativo ?? true,
      observacao: data.observacao || "",
    });
  }

  async function editar(id) {
    if (!empresaId) {
      setMsg("Empresa não identificada.");
      return;
    }

    try {
      setMsg("");
      const params = new URLSearchParams();
      params.set("empresa_id", String(empresaId));

      const res = await fetch(`/api/de-para-fiscal/${id}?${params.toString()}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      }

      preencherFormulario(data);
    } catch (e) {
      setMsg(`Erro ao carregar cadastro: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function salvar() {
    if (!empresaId) {
      setMsg("Empresa não identificada.");
      return;
    }

    try {
      setMsg("");

      const payload = {
        empresa_id: Number(empresaId),
        cfop_origem: form.cfop_origem?.trim() || null,
        natureza_origem: form.natureza_origem?.trim() || null,
        cst_origem: form.cst_origem?.trim() || null,
        serie_origem: form.serie_origem?.trim() || null,
        cfop_destino: form.cfop_destino?.trim() || null,
        natureza_destino: form.natureza_destino?.trim() || null,
        cst_destino: form.cst_destino?.trim() || null,
        especie_serie_destino: form.especie_serie_destino?.trim() || null,
        ativo: !!form.ativo,
        observacao: form.observacao?.trim() || null,
      };

      const isEdit = !!form.id;
      const url = isEdit ? `/api/de-para-fiscal/${form.id}` : `/api/de-para-fiscal`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      }

      setMsg(
        isEdit
          ? "De / Para fiscal atualizado com sucesso."
          : "De / Para fiscal criado com sucesso."
      );

      preencherFormulario(data);
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao salvar: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function excluir(id) {
    if (!id) return;

    if (!empresaId) {
      setMsg("Empresa não identificada.");
      return;
    }

    const ok = window.confirm("Deseja realmente excluir este de/para fiscal?");
    if (!ok) return;

    try {
      setMsg("");

      const res = await fetch(`/api/de-para-fiscal/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: Number(empresaId) }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      }

      setMsg("De / Para fiscal excluído com sucesso.");
      limparFormulario();
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao excluir: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function limparFiltros() {
    const cleared = { q: "", cfop_origem: "", cfop_destino: "" };
    setFilters(cleared);
    loadRows(cleared);
  }

  function irAnterior() {
    if (selectedIndex <= 0) return;
    editar(rows[selectedIndex - 1].id);
  }

  function irProximo() {
    if (selectedIndex < 0 || selectedIndex >= rows.length - 1) return;
    editar(rows[selectedIndex + 1].id);
  }

  if (!empresaId) {
    return (
      <div style={pageStyle}>
        <div style={pageHeaderStyle}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>De / Para Fiscal</h1>
            <div style={{ color: "#64748b", marginTop: 4 }}>
              Gestão de mapeamento fiscal por empresa
            </div>
          </div>

          <div style={empresaBadgeStyle}>
            Empresa ID: <strong>-</strong>
          </div>
        </div>

        <div style={messageBoxStyle}>
          Empresa não identificada. Selecione uma empresa antes de consultar os de/para fiscais.
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>De / Para Fiscal</h1>
          <div style={{ color: "#64748b", marginTop: 4 }}>
            Gestão de mapeamento fiscal por empresa
          </div>
        </div>

        <div style={empresaBadgeStyle}>
          Empresa ID: <strong>{empresaId}</strong>
        </div>
      </div>

      {msg && (
        <div
          style={{
            ...messageBoxStyle,
            background: msg.toLowerCase().includes("erro") ? "#fff1f2" : "#f8fafc",
            borderColor: msg.toLowerCase().includes("erro") ? "#fecdd3" : "#e2e8f0",
            color: msg.toLowerCase().includes("erro") ? "#be123c" : "#334155",
          }}
        >
          {msg}
        </div>
      )}

      <div style={mainGridStyle}>
        <div>
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={{ margin: 0 }}>Filtros</h3>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 260px" }}>
                <label style={labelStyle}>Pesquisar</label>
                <input
                  value={filters.q}
                  onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                  placeholder="Natureza, CST, série..."
                  style={inputStyle}
                />
              </div>

              <div style={{ width: 170 }}>
                <label style={labelStyle}>CFOP origem</label>
                <input
                  value={filters.cfop_origem}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, cfop_origem: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>

              <div style={{ width: 170 }}>
                <label style={labelStyle}>CFOP destino</label>
                <input
                  value={filters.cfop_destino}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, cfop_destino: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>

              <button onClick={() => loadRows()} style={primaryButtonStyle}>
                Pesquisar
              </button>

              <button
                onClick={() => {
                  limparFormulario();
                  setMsg("");
                }}
                style={successButtonStyle}
              >
                Novo
              </button>

              <button onClick={limparFiltros} style={secondaryButtonStyle}>
                Limpar
              </button>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div>
                <h3 style={{ margin: 0 }}>Mapeamentos ({rows.length})</h3>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                  Lista de de/para fiscais cadastrados
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 16 }}>Carregando...</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 16 }}>Nenhum de/para fiscal encontrado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={tableHead}>ID</th>
                      <th style={tableHead}>CFOP origem</th>
                      <th style={tableHead}>Natureza origem</th>
                      <th style={tableHead}>CST origem</th>
                      <th style={tableHead}>Série origem</th>
                      <th style={tableHead}>CFOP destino</th>
                      <th style={tableHead}>Natureza destino</th>
                      <th style={tableHead}>CST destino</th>
                      <th style={tableHead}>Espécie/Série destino</th>
                      <th style={tableHead}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} style={{ background: form.id === r.id ? "#f8fbff" : "#fff" }}>
                        <td style={tableCell}>{r.id}</td>
                        <td style={tableCell}>{r.cfop_origem || "-"}</td>
                        <td style={tableCell}>{r.natureza_origem || "-"}</td>
                        <td style={tableCell}>{r.cst_origem || "-"}</td>
                        <td style={tableCell}>{r.serie_origem || "-"}</td>
                        <td style={tableCell}>{r.cfop_destino || "-"}</td>
                        <td style={tableCell}>{r.natureza_destino || "-"}</td>
                        <td style={tableCell}>{r.cst_destino || "-"}</td>
                        <td style={tableCell}>{r.especie_serie_destino || "-"}</td>
                        <td style={tableCell}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={() => editar(r.id)} style={miniBtn}>
                              Editar
                            </button>
                            <button onClick={() => excluir(r.id)} style={miniBtnDanger}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={detailCardStyle}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
            {form.id ? "Alterar De / Para Fiscal" : "Novo De / Para Fiscal"}
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Empresa</label>
            <input
              value={form.empresa_id || ""}
              readOnly
              style={{ ...inputStyle, background: "#f1f5f9" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>ID mapa</label>
              <input
                value={form.id || ""}
                readOnly
                style={{ ...inputStyle, background: "#f1f5f9" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Série origem</label>
              <input
                value={form.serie_origem}
                onChange={(e) => setForm((prev) => ({ ...prev, serie_origem: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={sectionTitle}>Dados de origem</div>

          <div style={formGrid2}>
            <div>
              <label style={labelStyle}>CFOP origem</label>
              <input
                value={form.cfop_origem}
                onChange={(e) => setForm((prev) => ({ ...prev, cfop_origem: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>CST origem</label>
              <input
                value={form.cst_origem}
                onChange={(e) => setForm((prev) => ({ ...prev, cst_origem: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Natureza origem</label>
            <input
              value={form.natureza_origem}
              onChange={(e) => setForm((prev) => ({ ...prev, natureza_origem: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={sectionTitle}>Dados de destino</div>

          <div style={formGrid2}>
            <div>
              <label style={labelStyle}>CFOP destino</label>
              <input
                value={form.cfop_destino}
                onChange={(e) => setForm((prev) => ({ ...prev, cfop_destino: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>CST destino</label>
              <input
                value={form.cst_destino}
                onChange={(e) => setForm((prev) => ({ ...prev, cst_destino: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Natureza destino</label>
            <input
              value={form.natureza_destino}
              onChange={(e) => setForm((prev) => ({ ...prev, natureza_destino: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Espécie / Série destino</label>
            <input
              value={form.especie_serie_destino}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, especie_serie_destino: e.target.value }))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Observação</label>
            <textarea
              value={form.observacao}
              onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
              style={textAreaStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={!!form.ativo}
                onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
              />
              Ativo
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            <button onClick={salvar} style={primaryButtonStyle}>
              {form.id ? "Atualizar" : "Cadastrar"}
            </button>
            <button
              onClick={() => excluir(form.id)}
              disabled={!form.id}
              style={{
                ...dangerButtonStyle,
                opacity: form.id ? 1 : 0.5,
                cursor: form.id ? "pointer" : "not-allowed",
              }}
            >
              Excluir
            </button>
            <button onClick={limparFormulario} style={secondaryButtonStyle}>
              Novo
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <button
              onClick={irAnterior}
              disabled={selectedIndex <= 0}
              style={{
                ...secondaryButtonStyle,
                opacity: selectedIndex <= 0 ? 0.5 : 1,
                cursor: selectedIndex <= 0 ? "not-allowed" : "pointer",
              }}
            >
              ← Anterior
            </button>

            <button
              onClick={irProximo}
              disabled={selectedIndex < 0 || selectedIndex >= rows.length - 1}
              style={{
                ...secondaryButtonStyle,
                opacity: selectedIndex < 0 || selectedIndex >= rows.length - 1 ? 0.5 : 1,
                cursor:
                  selectedIndex < 0 || selectedIndex >= rows.length - 1
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Próximo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FiscalDeParaRoute({ empresaId: empresaIdServer }) {
  const { data: session, status } = useSession();

  const empresaId =
    session?.user?.empresa_id ??
    session?.empresa_id ??
    empresaIdServer ??
    null;

  if (status === "loading" && !empresaIdServer) {
    return <div style={{ padding: 24 }}>Carregando...</div>;
  }

  return <FiscalDeParaPage empresaId={empresaId} />;
}

export async function getServerSideProps(context) {
  const session = await getSession(context);

  const empresaId =
    session?.user?.empresa_id ??
    session?.empresa_id ??
    null;

  return {
    props: {
      empresaId: empresaId || null,
    },
  };
}

const pageStyle = {
  padding: 20,
  background: "#f8fafc",
  minHeight: "100vh",
};

const pageHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 16,
};

const empresaBadgeStyle = {
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
  padding: "10px 14px",
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
};

const messageBoxStyle = {
  marginBottom: 16,
  padding: "14px 16px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  fontWeight: 600,
};

const mainGridStyle = {
  display: "grid",
  gridTemplateColumns: "1.35fr 560px",
  gap: 18,
  alignItems: "start",
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const detailCardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  height: 40,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: "0 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
};

const textAreaStyle = {
  width: "100%",
  minHeight: 90,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: 12,
  fontSize: 14,
  outline: "none",
  resize: "vertical",
  background: "#fff",
};

const sectionTitle = {
  marginTop: 8,
  marginBottom: 12,
  fontWeight: 700,
  fontSize: 15,
  color: "#0f172a",
  borderBottom: "1px solid #e2e8f0",
  paddingBottom: 8,
};

const formGrid2 = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginBottom: 10,
};

const primaryButtonStyle = {
  height: 40,
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  padding: "0 16px",
  cursor: "pointer",
};

const successButtonStyle = {
  height: 40,
  borderRadius: 10,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 700,
  padding: "0 16px",
  cursor: "pointer",
};

const secondaryButtonStyle = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
  padding: "0 16px",
  cursor: "pointer",
};

const dangerButtonStyle = {
  height: 40,
  borderRadius: 10,
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontWeight: 700,
  padding: "0 16px",
  cursor: "pointer",
};

const miniBtn = {
  border: "none",
  background: "#38bdf8",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};

const miniBtnDanger = {
  border: "none",
  background: "#ef4444",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const tableHead = {
  textAlign: "left",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  padding: "12px 10px",
  color: "#334155",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const tableCell = {
  padding: "12px 10px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
};