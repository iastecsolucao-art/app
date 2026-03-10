import { useEffect, useState } from "react";

function onlyDigits(s) {
  return (s ?? "").toString().replace(/\D/g, "");
}

export default function ParticipantesPage() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    tipo: "",
    uf: "",
  });

  const [form, setForm] = useState({
    id: null,
    tipo: "EMITENTE",
    cnpj: "",
    xnome: "",
    ie: "",
    uf: "",
    municipio: "",
  });

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

      if (!res.ok) throw new Error(data?.error || data?.details || `Falha (${res.status})`);

      setRows(Array.isArray(data.rows) ? data.rows : []);
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
    setForm({
      id: null,
      tipo: "EMITENTE",
      cnpj: "",
      xnome: "",
      ie: "",
      uf: "",
      municipio: "",
    });
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
      if (!res.ok) throw new Error(data?.error || data?.details || `Falha (${res.status})`);

      setMsg(isEdit ? "Cadastro atualizado com sucesso." : "Cadastro criado com sucesso.");
      limparFormulario();
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao salvar: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function editar(id) {
    try {
      setMsg("");

      const res = await fetch(`/api/participantes/${id}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || data?.details || `Falha (${res.status})`);

      setForm({
        id: data.id,
        tipo: data.tipo || "EMITENTE",
        cnpj: data.cnpj || "",
        xnome: data.xnome || "",
        ie: data.ie || "",
        uf: data.uf || "",
        municipio: data.municipio || "",
      });
    } catch (e) {
      setMsg(`Erro ao carregar cadastro: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function excluir(id) {
    const ok = window.confirm("Deseja realmente excluir este cadastro?");
    if (!ok) return;

    try {
      setMsg("");

      const res = await fetch(`/api/participantes/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.details || `Falha (${res.status})`);

      setMsg("Cadastro excluído com sucesso.");
      if (form.id === id) limparFormulario();
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

  return (
    <div style={{ padding: 20 }}>
      <h1>Participantes da NF-e</h1>

      {msg && (
        <p style={{ color: msg.toLowerCase().includes("erro") ? "red" : "green", fontWeight: "bold" }}>
          {msg}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr auto",
          gap: 8,
          marginBottom: 16,
          alignItems: "end",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Busca</label>
          <input
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            placeholder="CNPJ, nome, IE, município..."
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Tipo</label>
          <select
            value={filters.tipo}
            onChange={(e) => setFilters((prev) => ({ ...prev, tipo: e.target.value }))}
            style={{ width: "100%", padding: 6 }}
          >
            <option value="">Todos</option>
            <option value="EMITENTE">Emitente</option>
            <option value="DESTINATARIO">Destinatário</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>UF</label>
          <input
            value={filters.uf}
            onChange={(e) => setFilters((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))}
            placeholder="SP"
            maxLength={2}
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => loadRows()}>Buscar</button>
          <button onClick={limparFiltros}>Limpar</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 700px" }}>
          {loading ? (
            <p>Carregando...</p>
          ) : rows.length === 0 ? (
            <p>Nenhum cadastro encontrado.</p>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f7f7f7" }}>
                    <th style={th}>Tipo</th>
                    <th style={th}>CNPJ</th>
                    <th style={th}>Nome</th>
                    <th style={th}>IE</th>
                    <th style={th}>UF</th>
                    <th style={th}>Município</th>
                    <th style={th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td style={td}>{r.tipo}</td>
                      <td style={td}>{r.cnpj}</td>
                      <td style={td}>{r.xnome}</td>
                      <td style={td}>{r.ie || "-"}</td>
                      <td style={td}>{r.uf || "-"}</td>
                      <td style={td}>{r.municipio || "-"}</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => editar(r.id)}>Editar</button>
                          <button onClick={() => excluir(r.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ flex: "1 1 360px", border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>{form.id ? "Editar participante" : "Novo participante"}</h3>

          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
                style={{ width: "100%", padding: 6 }}
              >
                <option value="EMITENTE">Emitente</option>
                <option value="DESTINATARIO">Destinatário</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>CNPJ</label>
              <input
                value={form.cnpj}
                onChange={(e) => setForm((prev) => ({ ...prev, cnpj: onlyDigits(e.target.value) }))}
                maxLength={14}
                style={{ width: "100%", padding: 6 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Nome</label>
              <input
                value={form.xnome}
                onChange={(e) => setForm((prev) => ({ ...prev, xnome: e.target.value }))}
                style={{ width: "100%", padding: 6 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>IE</label>
              <input
                value={form.ie}
                onChange={(e) => setForm((prev) => ({ ...prev, ie: e.target.value }))}
                style={{ width: "100%", padding: 6 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>UF</label>
              <input
                value={form.uf}
                maxLength={2}
                onChange={(e) => setForm((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                style={{ width: "100%", padding: 6 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Município</label>
              <input
                value={form.municipio}
                onChange={(e) => setForm((prev) => ({ ...prev, municipio: e.target.value }))}
                style={{ width: "100%", padding: 6 }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={salvar}>{form.id ? "Salvar alterações" : "Cadastrar"}</button>
              <button type="button" onClick={limparFormulario}>Novo</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: 8,
  borderBottom: "1px solid #eee",
};

const td = {
  padding: 8,
  borderBottom: "1px solid #f0f0f0",
  verticalAlign: "top",
};