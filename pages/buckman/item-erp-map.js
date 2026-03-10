import { useEffect, useMemo, useState } from "react";

function onlyDigits(s) {
  return (s ?? "").toString().replace(/\D/g, "");
}

function formatCnpj(cnpj) {
  const v = onlyDigits(cnpj);
  if (v.length !== 14) return cnpj || "";
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

const STATUS_OPTIONS = ["PENDENTE", "MAPEADO", "ENVIADO", "ERRO", "IGNORADO"];

const initialForm = {
  id: null,
  participante_id: "",
  sistema_destino: "ERP",

  cnpj_fornecedor: "",
  cprod_origem: "",
  xprod_origem: "",
  ncm_origem: "",
  cfop_origem: "",
  unidade_origem: "",

  codigo_produto_erp: "",
  sku_erp: "",
  descricao_erp: "",
  unidade_erp: "",
  ncm_erp: "",

  ativo: true,
  observacao: "",
  status_map: "PENDENTE",
};

export default function ItemErpMapPage() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    cnpj_fornecedor: "",
    status_map: "",
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
      if (f.cnpj_fornecedor) params.set("cnpj_fornecedor", onlyDigits(f.cnpj_fornecedor));
      if (f.status_map) params.set("status_map", f.status_map);

      const res = await fetch(`/api/item-erp-map?${params.toString()}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || data?.details || `Falha (${res.status})`);

      const nextRows = Array.isArray(data.rows) ? data.rows : [];
      setRows(nextRows);

      if (form.id) {
        const updated = nextRows.find((r) => r.id === form.id);
        if (!updated) setForm(initialForm);
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
      participante_id: data.participante_id ?? "",
      sistema_destino: data.sistema_destino || "ERP",

      cnpj_fornecedor: data.cnpj_fornecedor || "",
      cprod_origem: data.cprod_origem || "",
      xprod_origem: data.xprod_origem || "",
      ncm_origem: data.ncm_origem || "",
      cfop_origem: data.cfop_origem || "",
      unidade_origem: data.unidade_origem || "",

      codigo_produto_erp: data.codigo_produto_erp || "",
      sku_erp: data.sku_erp || "",
      descricao_erp: data.descricao_erp || "",
      unidade_erp: data.unidade_erp || "",
      ncm_erp: data.ncm_erp || "",

      ativo: data.ativo ?? true,
      observacao: data.observacao || "",
      status_map: data.status_map || "PENDENTE",
    });
  }

  async function editar(id) {
    try {
      setMsg("");
      const res = await fetch(`/api/item-erp-map/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      preencherFormulario(data);
    } catch (e) {
      setMsg(`Erro ao carregar cadastro: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function salvar() {
    try {
      setMsg("");

      const payload = {
        participante_id: form.participante_id ? Number(form.participante_id) : null,
        sistema_destino: form.sistema_destino || "ERP",

        cnpj_fornecedor: onlyDigits(form.cnpj_fornecedor),
        cprod_origem: form.cprod_origem,
        xprod_origem: form.xprod_origem,
        ncm_origem: form.ncm_origem,
        cfop_origem: form.cfop_origem,
        unidade_origem: form.unidade_origem,

        codigo_produto_erp: form.codigo_produto_erp,
        sku_erp: form.sku_erp,
        descricao_erp: form.descricao_erp,
        unidade_erp: form.unidade_erp,
        ncm_erp: form.ncm_erp,

        ativo: !!form.ativo,
        observacao: form.observacao,
        status_map: form.status_map,
      };

      const isEdit = !!form.id;
      const url = isEdit ? `/api/item-erp-map/${form.id}` : `/api/item-erp-map`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.details || `Falha (${res.status})`);

      setMsg(isEdit ? "Mapeamento de item atualizado com sucesso." : "Mapeamento de item criado com sucesso.");
      preencherFormulario(data);
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao salvar: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function excluir(id) {
    if (!id) return;
    const ok = window.confirm("Deseja realmente excluir este mapeamento de item?");
    if (!ok) return;

    try {
      setMsg("");

      const res = await fetch(`/api/item-erp-map/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.details || `Falha (${res.status})`);

      setMsg("Mapeamento de item excluído com sucesso.");
      limparFormulario();
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao excluir: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function limparFiltros() {
    const cleared = { q: "", cnpj_fornecedor: "", status_map: "" };
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
        📦 De / Para Itens ERP
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
          gridTemplateColumns: "1.35fr 560px",
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
                  placeholder="Código origem, descrição, código ERP..."
                  style={inputStyle}
                />
              </div>

              <div style={{ width: 170 }}>
                <label style={labelStyle}>CNPJ fornecedor</label>
                <input
                  value={filters.cnpj_fornecedor}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      cnpj_fornecedor: onlyDigits(e.target.value),
                    }))
                  }
                  style={inputStyle}
                />
              </div>

              <div style={{ width: 150 }}>
                <label style={labelStyle}>Status</label>
                <select
                  value={filters.status_map}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status_map: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Todos</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
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
              <div style={{ padding: 16 }}>Nenhum mapeamento de item encontrado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f3f3f3" }}>
                      <th style={th}>ID</th>
                      <th style={th}>CNPJ fornecedor</th>
                      <th style={th}>Cód. origem</th>
                      <th style={th}>Descrição origem</th>
                      <th style={th}>Cód. ERP</th>
                      <th style={th}>Descrição ERP</th>
                      <th style={th}>Status</th>
                      <th style={th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} style={{ background: form.id === r.id ? "#eaf3ff" : "#fff" }}>
                        <td style={td}>{r.id}</td>
                        <td style={td}>{formatCnpj(r.cnpj_fornecedor)}</td>
                        <td style={td}>{r.cprod_origem || "-"}</td>
                        <td style={td}>{r.xprod_origem || "-"}</td>
                        <td style={td}>{r.codigo_produto_erp || "-"}</td>
                        <td style={td}>{r.descricao_erp || "-"}</td>
                        <td style={td}>{r.status_map || "-"}</td>
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
            {form.id ? "Alterar De / Para Item ERP" : "Novo De / Para Item ERP"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={labelStyle}>ID mapa</label>
              <input value={form.id || ""} readOnly style={{ ...inputStyle, background: "#f1f1f1" }} />
            </div>
            <div>
              <label style={labelStyle}>Participante ID</label>
              <input
                value={form.participante_id}
                onChange={(e) => setForm((prev) => ({ ...prev, participante_id: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={sectionTitle}>Dados de origem</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <label style={labelStyle}>Sistema destino</label>
              <input
                value={form.sistema_destino}
                onChange={(e) => setForm((prev) => ({ ...prev, sistema_destino: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>CNPJ fornecedor</label>
              <input
                value={form.cnpj_fornecedor}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cnpj_fornecedor: onlyDigits(e.target.value) }))
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <label style={labelStyle}>Código origem</label>
              <input
                value={form.cprod_origem}
                onChange={(e) => setForm((prev) => ({ ...prev, cprod_origem: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Unidade origem</label>
              <input
                value={form.unidade_origem}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, unidade_origem: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Descrição origem</label>
            <input
              value={form.xprod_origem}
              onChange={(e) => setForm((prev) => ({ ...prev, xprod_origem: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <div>
              <label style={labelStyle}>NCM origem</label>
              <input
                value={form.ncm_origem}
                onChange={(e) => setForm((prev) => ({ ...prev, ncm_origem: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>CFOP origem</label>
              <input
                value={form.cfop_origem}
                onChange={(e) => setForm((prev) => ({ ...prev, cfop_origem: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={sectionTitle}>Dados ERP</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <label style={labelStyle}>Código produto ERP</label>
              <input
                value={form.codigo_produto_erp}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, codigo_produto_erp: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>SKU ERP</label>
              <input
                value={form.sku_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, sku_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Descrição ERP</label>
            <input
              value={form.descricao_erp}
              onChange={(e) => setForm((prev) => ({ ...prev, descricao_erp: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <label style={labelStyle}>Unidade ERP</label>
              <input
                value={form.unidade_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, unidade_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>NCM ERP</label>
              <input
                value={form.ncm_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, ncm_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Status mapa</label>
              <select
                value={form.status_map}
                onChange={(e) => setForm((prev) => ({ ...prev, status_map: e.target.value }))}
                style={inputStyle}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
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

const sectionTitle = {
  fontWeight: 700,
  fontSize: 14,
  marginBottom: 10,
  marginTop: 6,
  paddingBottom: 6,
  borderBottom: "1px solid #e5e7eb",
};

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

const textAreaStyle = {
  width: "100%",
  minHeight: 72,
  padding: "8px 10px",
  border: "1px solid #cfcfcf",
  borderRadius: 2,
  fontSize: 13,
  outline: "none",
  background: "#fff",
  resize: "vertical",
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