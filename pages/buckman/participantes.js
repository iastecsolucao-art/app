import { useEffect, useMemo, useState } from "react";

function onlyDigits(s) {
  return (s ?? "").toString().replace(/\D/g, "");
}

function formatCnpjCpf(value) {
  const v = onlyDigits(value);
  if (v.length === 14) {
    return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  if (v.length === 11) {
    return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return value || "";
}

const API_BASE = "/api/nfe-address";

const initialForm = {
  id: null,
  empresa_id: "",
  nfe_id: "",
  role: "DESTINATARIO",
  cnpj: "",
  cpf: "",
  xlgr: "",
  nro: "",
  xcpl: "",
  xbairro: "",
  cmun: "",
  xmun: "",
  uf: "",
  cep: "",
  cpais: "",
  xpais: "",
  fone: "",
  email: "",
};

export default function ParticipantesPage() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const [filters, setFilters] = useState({
    q: "",
    role: "",
    uf: "",
    empresa_id: "",
    nfe_id: "",
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
      if (f.role) params.set("role", f.role);
      if (f.uf) params.set("uf", f.uf);
      if (f.empresa_id) params.set("empresa_id", f.empresa_id);
      if (f.nfe_id) params.set("nfe_id", f.nfe_id);

      const res = await fetch(`${API_BASE}?${params.toString()}`);
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
      empresa_id: data.empresa_id ?? "",
      nfe_id: data.nfe_id ?? "",
      role: data.role || "DESTINATARIO",
      cnpj: data.cnpj || "",
      cpf: data.cpf || "",
      xlgr: data.xlgr || "",
      nro: data.nro || "",
      xcpl: data.xcpl || "",
      xbairro: data.xbairro || "",
      cmun: data.cmun || "",
      xmun: data.xmun || "",
      uf: data.uf || "",
      cep: data.cep || "",
      cpais: data.cpais || "",
      xpais: data.xpais || "",
      fone: data.fone || "",
      email: data.email || "",
    });
  }

  async function editar(id) {
    try {
      setMsg("");

      const res = await fetch(`${API_BASE}/${id}`);
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
        empresa_id: form.empresa_id ? Number(form.empresa_id) : null,
        nfe_id: form.nfe_id ? Number(form.nfe_id) : null,
        role: form.role,
        cnpj: onlyDigits(form.cnpj),
        cpf: onlyDigits(form.cpf),
        xlgr: form.xlgr,
        nro: form.nro,
        xcpl: form.xcpl,
        xbairro: form.xbairro,
        cmun: form.cmun,
        xmun: form.xmun,
        uf: form.uf,
        cep: onlyDigits(form.cep),
        cpais: form.cpais,
        xpais: form.xpais,
        fone: onlyDigits(form.fone),
        email: form.email,
      };

      const isEdit = !!form.id;
      const url = isEdit ? `${API_BASE}/${form.id}` : API_BASE;
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

      setMsg(isEdit ? "Participante atualizado com sucesso." : "Participante criado com sucesso.");
      preencherFormulario(data);
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao salvar: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function excluir(id) {
    if (!id) return;

    const ok = window.confirm("Deseja realmente excluir este participante?");
    if (!ok) return;

    try {
      setMsg("");

      const res = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      }

      setMsg("Participante excluído com sucesso.");
      limparFormulario();
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao excluir: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function enviarParaERP(row) {
    if (!row?.id) return;

    const ok = window.confirm(
      `Enviar participante ID ${row.id} para o ERP com status inicial PENDENTE?`
    );
    if (!ok) return;

    try {
      setSendingId(row.id);
      setMsg("");

      const payload = {
        empresa_id: row.empresa_id,
        nfe_id: row.nfe_id,
        address_id: row.id,
        role: row.role,
        status_stage: "PENDENTE",
      };

      const res = await fetch(`${API_BASE}/${row.id}/enviar-erp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      }

      setMsg(data?.message || "Participante enviado para o ERP com status PENDENTE.");
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao enviar para o ERP: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSendingId(null);
    }
  }

  function limparFiltros() {
    const cleared = { q: "", role: "", uf: "", empresa_id: "", nfe_id: "" };
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
        📦 Participantes da NF (nfe_address)
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
          gridTemplateColumns: "1.45fr 520px",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div>
          <div style={panelStyle}>
            <div style={{ display: "flex", gap: 6, alignItems: "end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 220px" }}>
                <label style={labelStyle}>Pesquisar</label>
                <input
                  value={filters.q}
                  onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                  placeholder="Pesquisar por CNPJ/CPF, e-mail, município, logradouro..."
                  style={inputStyle}
                />
              </div>

              <div style={{ width: 140 }}>
                <label style={labelStyle}>Participante</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Todos</option>
                  <option value="EMIT">Emitente</option>
                  <option value="DEST">Destinatário</option>
                  <option value="RET">Retirada</option>
                  <option value="ENTREGA">Entrega</option>
                  <option value="TRANSP">Transportador</option>
                </select>
              </div>

              <div style={{ width: 90 }}>
                <label style={labelStyle}>UF</label>
                <input
                  value={filters.uf}
                  onChange={(e) => setFilters((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                  maxLength={2}
                  placeholder="SP"
                  style={inputStyle}
                />
              </div>

              <div style={{ width: 110 }}>
                <label style={labelStyle}>Empresa</label>
                <input
                  value={filters.empresa_id}
                  onChange={(e) => setFilters((prev) => ({ ...prev, empresa_id: onlyDigits(e.target.value) }))}
                  style={inputStyle}
                />
              </div>

              <div style={{ width: 110 }}>
                <label style={labelStyle}>NF-e</label>
                <input
                  value={filters.nfe_id}
                  onChange={(e) => setFilters((prev) => ({ ...prev, nfe_id: onlyDigits(e.target.value) }))}
                  style={inputStyle}
                />
              </div>

              <button onClick={() => loadRows()} style={btnGray}>Pesquisar</button>
              <button onClick={() => { limparFormulario(); setMsg(""); }} style={btnGreen}>Novo</button>
              <button onClick={limparFiltros} style={btnLight}>Limpar</button>
            </div>
          </div>

          <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 16 }}>Carregando...</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 16 }}>Nenhum participante encontrado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f3f3f3" }}>
                      <th style={th}>ID</th>
                      <th style={th}>Empresa</th>
                      <th style={th}>NF-e</th>
                      <th style={th}>Role</th>
                      <th style={th}>Documento</th>
                      <th style={th}>Município</th>
                      <th style={th}>UF</th>
                      <th style={th}>E-mail</th>
                      <th style={th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} style={{ background: form.id === r.id ? "#eaf3ff" : "#fff" }}>
                        <td style={td}>{r.id}</td>
                        <td style={td}>{r.empresa_id ?? "-"}</td>
                        <td style={td}>{r.nfe_id ?? "-"}</td>
                        <td style={td}>{r.role || "-"}</td>
                        <td style={td}>{formatCnpjCpf(r.cnpj || r.cpf)}</td>
                        <td style={td}>{r.xmun || "-"}</td>
                        <td style={td}>{r.uf || "-"}</td>
                        <td style={td}>{r.email || "-"}</td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button onClick={() => editar(r.id)} style={miniBtn}>Editar</button>
                            <button onClick={() => enviarParaERP(r)} style={miniBtnGreen} disabled={sendingId === r.id}>
                              {sendingId === r.id ? "Enviando..." : "Enviar ERP"}
                            </button>
                            <button onClick={() => excluir(r.id)} style={miniBtnDanger}>Excluir</button>
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

        <div style={panelStyle}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
            {form.id ? "Alterar participante" : "Novo participante"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>ID</label>
              <input value={form.id || ""} readOnly style={{ ...inputStyle, background: "#f1f1f1" }} />
            </div>
            <div>
              <label style={labelStyle}>Empresa</label>
              <input value={form.empresa_id} onChange={(e) => setForm((prev) => ({ ...prev, empresa_id: onlyDigits(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>NF-e</label>
              <input value={form.nfe_id} onChange={(e) => setForm((prev) => ({ ...prev, nfe_id: onlyDigits(e.target.value) }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Role</label>
              <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} style={inputStyle}>
                <option value="EMIT">Emitente</option>
                <option value="DEST">Destinatário</option>
                <option value="RET">Retirada</option>
                <option value="ENTREGA">Entrega</option>
                <option value="TRANSP">Transportador</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>CNPJ</label>
              <input value={form.cnpj} onChange={(e) => setForm((prev) => ({ ...prev, cnpj: onlyDigits(e.target.value), cpf: "" }))} maxLength={14} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>CPF</label>
              <input value={form.cpf} onChange={(e) => setForm((prev) => ({ ...prev, cpf: onlyDigits(e.target.value), cnpj: "" }))} maxLength={11} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Logradouro</label>
            <input value={form.xlgr} onChange={(e) => setForm((prev) => ({ ...prev, xlgr: e.target.value }))} style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "0.7fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Número</label>
              <input value={form.nro} onChange={(e) => setForm((prev) => ({ ...prev, nro: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Complemento</label>
              <input value={form.xcpl} onChange={(e) => setForm((prev) => ({ ...prev, xcpl: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Bairro</label>
              <input value={form.xbairro} onChange={(e) => setForm((prev) => ({ ...prev, xbairro: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 0.7fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Município</label>
              <input value={form.xmun} onChange={(e) => setForm((prev) => ({ ...prev, xmun: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Cód. Município</label>
              <input value={form.cmun} onChange={(e) => setForm((prev) => ({ ...prev, cmun: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>UF</label>
              <input value={form.uf} maxLength={2} onChange={(e) => setForm((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>CEP</label>
              <input value={form.cep} onChange={(e) => setForm((prev) => ({ ...prev, cep: onlyDigits(e.target.value) }))} maxLength={8} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Fone</label>
              <input value={form.fone} onChange={(e) => setForm((prev) => ({ ...prev, fone: onlyDigits(e.target.value) }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Cód. País</label>
              <input value={form.cpais} onChange={(e) => setForm((prev) => ({ ...prev, cpais: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>País</label>
              <input value={form.xpais} onChange={(e) => setForm((prev) => ({ ...prev, xpais: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>E-mail</label>
            <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} style={inputStyle} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            <button onClick={salvar} style={btnBlue}>{form.id ? "Atualizar" : "Cadastrar"}</button>
            <button
              onClick={() => form.id && enviarParaERP(form)}
              disabled={!form.id || sendingId === form.id}
              style={{
                ...btnGreen,
                opacity: form.id ? 1 : 0.5,
                cursor: form.id ? "pointer" : "not-allowed",
              }}
            >
              {sendingId === form.id ? "Enviando..." : "Enviar para ERP"}
            </button>
            <button
              onClick={() => excluir(form.id)}
              disabled={!form.id}
              style={{ ...btnRed, opacity: form.id ? 1 : 0.5, cursor: form.id ? "pointer" : "not-allowed" }}
            >
              Excluir
            </button>
            <button onClick={limparFormulario} style={btnLight}>Novo</button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <button onClick={irAnterior} disabled={selectedIndex <= 0} style={{ ...btnNav, opacity: selectedIndex <= 0 ? 0.5 : 1, cursor: selectedIndex <= 0 ? "not-allowed" : "pointer" }}>⏪ Anterior</button>
            <button onClick={irProximo} disabled={selectedIndex < 0 || selectedIndex >= rows.length - 1} style={{ ...btnNav, opacity: selectedIndex < 0 || selectedIndex >= rows.length - 1 ? 0.5 : 1, cursor: selectedIndex < 0 || selectedIndex >= rows.length - 1 ? "not-allowed" : "pointer" }}>Próximo ⏩</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const panelStyle = {
  background: "#fff",
  border: "1px solid #d9d9d9",
  borderRadius: 4,
  padding: 14,
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

const miniBtnGreen = {
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 3,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
};
