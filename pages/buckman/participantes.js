import { useEffect, useMemo, useState } from "react";

function onlyDigits(s) {
  return (s ?? "").toString().replace(/\D/g, "");
}

function formatCnpj(cnpj) {
  const v = onlyDigits(cnpj);
  if (v.length !== 14) return cnpj || "";
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

const initialForm = {
  id: null,
  tipo: "EMITENTE",
  cnpj: "",
  xnome: "",
  ie: "",
  uf: "",
  municipio: "",
};

export default function ParticipantesPage() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    tipo: "",
    uf: "",
  });

  const [form, setForm] = useState(initialForm);

  const selectedIndex = useMemo(() => {
    if (!form.id) return -1;
    return rows.findIndex((r) => r.id === form.id);
  }, [rows, form.id]);

  async function loadRows(customFilters) {
    try {
      setLoading(true);
      setMsg("");

      const f = customFilters || filters;
      const params = new URLSearchParams();

      if (f.q) params.set("q", f.q);
      if (f.tipo) params.set("tipo", f.tipo);
      if (f.uf) params.set("uf", f.uf);

      const res = await fetch(`/api/participantes?${params.toString()}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      }

      const nextRows = Array.isArray(data.rows) ? data.rows : [];
      setRows(nextRows);

      if (form.id) {
        const updated = nextRows.find((r) => r.id === form.id);
        if (!updated) {
          setForm(initialForm);
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
    loadRows();
  }, []);

  function limparFormulario() {
    setForm(initialForm);
    setMsg("");
  }

  function preencherFormulario(data) {
    setForm({
      id: data.id ?? null,
      tipo: data.tipo || "EMITENTE",
      cnpj: data.cnpj || "",
      xnome: data.xnome || "",
      ie: data.ie || "",
      uf: data.uf || "",
      municipio: data.municipio || "",
    });
  }

  async function editar(id) {
    try {
      setMsg("");

      const res = await fetch(`/api/participantes/${id}`);
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
    try {
      setMsg("");

      const payload = {
        tipo: form.tipo,
        cnpj: onlyDigits(form.cnpj),
        xnome: form.xnome,
        ie: form.ie,
        uf: form.uf,
        municipio: form.municipio,
      };

      const isEdit = !!form.id;
      const url = isEdit ? `/api/participantes/${form.id}` : "/api/participantes";
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

      setMsg(isEdit ? "Cadastro atualizado com sucesso." : "Cadastro criado com sucesso.");

      if (isEdit) {
        preencherFormulario(data);
      } else {
        preencherFormulario(data);
      }

      await loadRows();
    } catch (e) {
      setMsg(`Erro ao salvar: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function excluir(id) {
    if (!id) return;

    const ok = window.confirm("Deseja realmente excluir este cadastro?");
    if (!ok) return;

    try {
      setMsg("");

      const res = await fetch(`/api/participantes/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      }

      setMsg("Cadastro excluído com sucesso.");
      limparFormulario();
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao excluir: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function limparFiltros() {
    const cleared = { q: "", tipo: "", uf: "" };
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

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 14 }}>
        📦 Cadastro de Participantes
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 6,
            background: msg.toLowerCase().includes("erro") ? "#ffe5e5" : "#e8f7e8",
            color: msg.toLowerCase().includes("erro") ? "#b00020" : "#146c2e",
            border: `1px solid ${msg.toLowerCase().includes("erro") ? "#f2b8b5" : "#b7e1c0"}`,
            fontWeight: 600,
          }}
        >
          {msg}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 430px",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #d9d9d9",
              borderRadius: 4,
              padding: 14,
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 260px" }}>
                <label style={labelStyle}>Pesquisar</label>
                <input
                  value={filters.q}
                  onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                  placeholder="Pesquisar por CNPJ, nome, IE, município..."
                  style={inputStyle}
                />
              </div>

              <div style={{ width: 150 }}>
                <label style={labelStyle}>Tipo</label>
                <select
                  value={filters.tipo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, tipo: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Todos</option>
                  <option value="EMITENTE">Emitente</option>
                  <option value="DESTINATARIO">Destinatário</option>
                </select>
              </div>

              <div style={{ width: 90 }}>
                <label style={labelStyle}>UF</label>
                <input
                  value={filters.uf}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))
                  }
                  maxLength={2}
                  placeholder="SP"
                  style={inputStyle}
                />
              </div>

              <button onClick={() => loadRows()} style={btnGray}>
                Pesquisar
              </button>

              <button
                onClick={() => {
                  limparFormulario();
                  setMsg("");
                }}
                style={btnGreen}
              >
                Novo
              </button>

              <button onClick={limparFiltros} style={btnLight}>
                Limpar
              </button>
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1px solid #d9d9d9",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {loading ? (
              <div style={{ padding: 16 }}>Carregando...</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 16 }}>Nenhum cadastro encontrado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f3f3f3" }}>
                      <th style={th}>ID</th>
                      <th style={th}>Tipo</th>
                      <th style={th}>CNPJ</th>
                      <th style={th}>Nome</th>
                      <th style={th}>UF</th>
                      <th style={th}>Município</th>
                      <th style={th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        style={{
                          background: form.id === r.id ? "#eaf3ff" : "#fff",
                        }}
                      >
                        <td style={td}>{r.id}</td>
                        <td style={td}>{r.tipo}</td>
                        <td style={td}>{formatCnpj(r.cnpj)}</td>
                        <td style={td}>{r.xnome}</td>
                        <td style={td}>{r.uf || "-"}</td>
                        <td style={td}>{r.municipio || "-"}</td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 6 }}>
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

        <div
          style={{
            background: "#fff",
            border: "1px solid #d9d9d9",
            borderRadius: 4,
            padding: 14,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
            {form.id ? "Alterar participante" : "Novo participante"}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>ID</label>
            <input value={form.id || ""} readOnly style={{ ...inputStyle, background: "#f1f1f1" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
              style={inputStyle}
            >
              <option value="EMITENTE">Emitente</option>
              <option value="DESTINATARIO">Destinatário</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>CNPJ</label>
            <input
              value={form.cnpj}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, cnpj: onlyDigits(e.target.value) }))
              }
              maxLength={14}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Nome</label>
            <input
              value={form.xnome}
              onChange={(e) => setForm((prev) => ({ ...prev, xnome: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>IE</label>
            <input
              value={form.ie}
              onChange={(e) => setForm((prev) => ({ ...prev, ie: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>UF</label>
            <input
              value={form.uf}
              maxLength={2}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Município</label>
            <input
              value={form.municipio}
              onChange={(e) => setForm((prev) => ({ ...prev, municipio: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            <button onClick={salvar} style={btnBlue}>
              {form.id ? "Atualizar" : "Cadastrar"}
            </button>

            <button
              onClick={() => excluir(form.id)}
              disabled={!form.id}
              style={{
                ...btnRed,
                opacity: form.id ? 1 : 0.5,
                cursor: form.id ? "pointer" : "not-allowed",
              }}
            >
              Excluir
            </button>

            <button onClick={limparFormulario} style={btnLight}>
              Novo
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <button
              onClick={irAnterior}
              disabled={selectedIndex <= 0}
              style={{
                ...btnNav,
                opacity: selectedIndex <= 0 ? 0.5 : 1,
                cursor: selectedIndex <= 0 ? "not-allowed" : "pointer",
              }}
            >
              ⏪ Anterior
            </button>

            <button
              onClick={irProximo}
              disabled={selectedIndex < 0 || selectedIndex >= rows.length - 1}
              style={{
                ...btnNav,
                opacity: selectedIndex < 0 || selectedIndex >= rows.length - 1 ? 0.5 : 1,
                cursor:
                  selectedIndex < 0 || selectedIndex >= rows.length - 1
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              Próximo ⏩
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #cfcfcf",
  borderRadius: 2,
  fontSize: 13,
  outline: "none",
  background: "#fff",
};

const th = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap",
};

const td = {
  padding: 10,
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
};

const btnBlue = {
  background: "#2f6fed",
  color: "#fff",
  border: "none",
  borderRadius: 3,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

const btnRed = {
  background: "#e53935",
  color: "#fff",
  border: "none",
  borderRadius: 3,
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 600,
};

const btnGreen = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 3,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const btnGray = {
  background: "#6b7280",
  color: "#fff",
  border: "none",
  borderRadius: 3,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const btnLight = {
  background: "#e5e7eb",
  color: "#111827",
  border: "1px solid #d1d5db",
  borderRadius: 3,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 600,
};

const btnNav = {
  background: "#e5e7eb",
  color: "#111827",
  border: "1px solid #d1d5db",
  borderRadius: 3,
  padding: "8px 12px",
  fontWeight: 600,
};

const miniBtn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 3,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
};

const miniBtnDanger = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 3,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
};