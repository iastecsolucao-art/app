import { useEffect, useMemo, useState } from "react";

function onlyDigits(s) {
  return (s ?? "").toString().replace(/\D/g, "");
}

function formatCnpj(cnpj) {
  const v = onlyDigits(cnpj);
  if (v.length !== 14) return cnpj || "";
  return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

const STATUS_OPTIONS = [
  "PENDENTE",
  "MAPEADO",
  "ENVIANDO",
  "ENVIADO",
  "ERRO",
  "IGNORADO",
];

const initialForm = {
  id: null,
  participante_id: "",
  sistema_destino: "ERP",
  tipo: "",
  cnpj_origem: "",
  nome_origem: "",
  ie_origem: "",
  uf_origem: "",
  municipio_origem: "",
  xlgr_origem: "",
  nro_origem: "",
  xcpl_origem: "",
  xbair_origem: "",
  cmun_origem: "",
  cep_origem: "",
  cpais_origem: "",
  xpais_origem: "",
  fone_origem: "",

  codigo_erp: "",
  cnpj_erp: "",
  nome_erp: "",
  ie_erp: "",
  uf_erp: "",
  municipio_erp: "",
  xlgr_erp: "",
  nro_erp: "",
  xcpl_erp: "",
  xbair_erp: "",
  cmun_erp: "",
  cep_erp: "",
  cpais_erp: "",
  xpais_erp: "",
  fone_erp: "",
  email_erp: "",
  observacao: "",
  ativo: true,
  status_envio: "PENDENTE",
  ultimo_envio_em: "",
  ultimo_retorno: "",
};

export default function ParticipantesErpMapPage() {
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    tipo: "",
    status_envio: "",
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
      if (f.status_envio) params.set("status_envio", f.status_envio);

      const res = await fetch(`/api/participantes-erp-map?${params.toString()}`);
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
      participante_id: data.participante_id ?? "",
      sistema_destino: data.sistema_destino || "ERP",

      tipo: data.tipo || "",
      cnpj_origem: data.cnpj_origem || "",
      nome_origem: data.nome_origem || "",
      ie_origem: data.ie_origem || "",
      uf_origem: data.uf_origem || "",
      municipio_origem: data.municipio_origem || "",
      xlgr_origem: data.xlgr_origem || "",
      nro_origem: data.nro_origem || "",
      xcpl_origem: data.xcpl_origem || "",
      xbair_origem: data.xbair_origem || "",
      cmun_origem: data.cmun_origem || "",
      cep_origem: data.cep_origem || "",
      cpais_origem: data.cpais_origem || "",
      xpais_origem: data.xpais_origem || "",
      fone_origem: data.fone_origem || "",

      codigo_erp: data.codigo_erp || "",
      cnpj_erp: data.cnpj_erp || "",
      nome_erp: data.nome_erp || "",
      ie_erp: data.ie_erp || "",
      uf_erp: data.uf_erp || "",
      municipio_erp: data.municipio_erp || "",
      xlgr_erp: data.xlgr_erp || "",
      nro_erp: data.nro_erp || "",
      xcpl_erp: data.xcpl_erp || "",
      xbair_erp: data.xbair_erp || "",
      cmun_erp: data.cmun_erp || "",
      cep_erp: data.cep_erp || "",
      cpais_erp: data.cpais_erp || "",
      xpais_erp: data.xpais_erp || "",
      fone_erp: data.fone_erp || "",
      email_erp: data.email_erp || "",
      observacao: data.observacao || "",
      ativo: data.ativo ?? true,
      status_envio: data.status_envio || "PENDENTE",
      ultimo_envio_em: data.ultimo_envio_em || "",
      ultimo_retorno: data.ultimo_retorno || "",
    });
  }

  async function editar(id) {
    try {
      setMsg("");

      const res = await fetch(`/api/participantes-erp-map/${id}`);
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
        participante_id: form.participante_id ? Number(form.participante_id) : null,
        sistema_destino: form.sistema_destino || "ERP",

        codigo_erp: form.codigo_erp,
        cnpj_erp: onlyDigits(form.cnpj_erp),
        nome_erp: form.nome_erp,
        ie_erp: form.ie_erp,
        uf_erp: form.uf_erp,
        municipio_erp: form.municipio_erp,
        xlgr_erp: form.xlgr_erp,
        nro_erp: form.nro_erp,
        xcpl_erp: form.xcpl_erp,
        xbair_erp: form.xbair_erp,
        cmun_erp: form.cmun_erp,
        cep_erp: onlyDigits(form.cep_erp),
        cpais_erp: form.cpais_erp,
        xpais_erp: form.xpais_erp,
        fone_erp: onlyDigits(form.fone_erp),
        email_erp: form.email_erp,
        observacao: form.observacao,
        ativo: !!form.ativo,
        status_envio: form.status_envio,
      };

      const isEdit = !!form.id;
      const url = isEdit
        ? `/api/participantes-erp-map/${form.id}`
        : `/api/participantes-erp-map`;
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

      setMsg(isEdit ? "De / Para ERP atualizado com sucesso." : "De / Para ERP criado com sucesso.");
      preencherFormulario(data);
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao salvar: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function excluir(id) {
    if (!id) return;

    const ok = window.confirm("Deseja realmente excluir este de / para ERP?");
    if (!ok) return;

    try {
      setMsg("");

      const res = await fetch(`/api/participantes-erp-map/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      }

      setMsg("De / Para ERP excluído com sucesso.");
      limparFormulario();
      await loadRows();
    } catch (e) {
      setMsg(`Erro ao excluir: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function limparFiltros() {
    const cleared = { q: "", tipo: "", status_envio: "" };
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

  async function carregarParticipanteOrigem() {
    if (!form.participante_id) {
      setMsg("Informe o ID do participante.");
      return;
    }

    try {
      setMsg("");

      const res = await fetch(`/api/participantes/${form.participante_id}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.details || `Falha (${res.status})`);
      }

      setForm((prev) => ({
        ...prev,
        tipo: data.tipo || "",
        cnpj_origem: data.cnpj || "",
        nome_origem: data.xnome || "",
        ie_origem: data.ie || "",
        uf_origem: data.uf || "",
        municipio_origem: data.municipio || "",
        xlgr_origem: data.xlgr || "",
        nro_origem: data.nro || "",
        xcpl_origem: data.xcpl || "",
        xbair_origem: data.xbair || "",
        cmun_origem: data.cmun || "",
        cep_origem: data.cep || "",
        cpais_origem: data.cpais || "",
        xpais_origem: data.xpais || "",
        fone_origem: data.fone || "",

        cnpj_erp: prev.cnpj_erp || data.cnpj || "",
        nome_erp: prev.nome_erp || data.xnome || "",
        ie_erp: prev.ie_erp || data.ie || "",
        uf_erp: prev.uf_erp || data.uf || "",
        municipio_erp: prev.municipio_erp || data.municipio || "",
        xlgr_erp: prev.xlgr_erp || data.xlgr || "",
        nro_erp: prev.nro_erp || data.nro || "",
        xcpl_erp: prev.xcpl_erp || data.xcpl || "",
        xbair_erp: prev.xbair_erp || data.xbair || "",
        cmun_erp: prev.cmun_erp || data.cmun || "",
        cep_erp: prev.cep_erp || data.cep || "",
        cpais_erp: prev.cpais_erp || data.cpais || "",
        xpais_erp: prev.xpais_erp || data.xpais || "",
        fone_erp: prev.fone_erp || data.fone || "",
      }));
    } catch (e) {
      setMsg(`Erro ao carregar origem: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 14 }}>
        🔄 De / Para ERP
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
                  placeholder="Nome, CNPJ, código ERP..."
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

              <div style={{ width: 150 }}>
                <label style={labelStyle}>Status</label>
                <select
                  value={filters.status_envio}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status_envio: e.target.value }))
                  }
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
              <div style={{ padding: 16 }}>Nenhum de / para encontrado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f3f3f3" }}>
                      <th style={th}>ID</th>
                      <th style={th}>Tipo</th>
                      <th style={th}>CNPJ origem</th>
                      <th style={th}>Nome origem</th>
                      <th style={th}>Código ERP</th>
                      <th style={th}>Nome ERP</th>
                      <th style={th}>Status</th>
                      <th style={th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        style={{ background: form.id === r.id ? "#eaf3ff" : "#fff" }}
                      >
                        <td style={td}>{r.id}</td>
                        <td style={td}>{r.tipo || "-"}</td>
                        <td style={td}>{formatCnpj(r.cnpj_origem)}</td>
                        <td style={td}>{r.nome_origem || "-"}</td>
                        <td style={td}>{r.codigo_erp || "-"}</td>
                        <td style={td}>{r.nome_erp || "-"}</td>
                        <td style={td}>{r.status_envio || "-"}</td>
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
            {form.id ? "Alterar De / Para ERP" : "Novo De / Para ERP"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr auto",
              gap: 10,
              alignItems: "end",
              marginBottom: 16,
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

            <button onClick={carregarParticipanteOrigem} style={btnGray}>
              Carregar origem
            </button>
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
              <label style={labelStyle}>Tipo</label>
              <input value={form.tipo || ""} readOnly style={{ ...inputStyle, background: "#f8f8f8" }} />
            </div>
            <div>
              <label style={labelStyle}>Sistema destino</label>
              <input
                value={form.sistema_destino}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sistema_destino: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>CNPJ origem</label>
            <input value={formatCnpj(form.cnpj_origem)} readOnly style={{ ...inputStyle, background: "#f8f8f8" }} />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Nome origem</label>
            <input value={form.nome_origem} readOnly style={{ ...inputStyle, background: "#f8f8f8" }} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <label style={labelStyle}>IE origem</label>
              <input value={form.ie_origem} readOnly style={{ ...inputStyle, background: "#f8f8f8" }} />
            </div>
            <div>
              <label style={labelStyle}>UF origem</label>
              <input value={form.uf_origem} readOnly style={{ ...inputStyle, background: "#f8f8f8" }} />
            </div>
            <div>
              <label style={labelStyle}>Município origem</label>
              <input value={form.municipio_origem} readOnly style={{ ...inputStyle, background: "#f8f8f8" }} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Endereço origem</label>
            <textarea
              readOnly
              value={[
                form.xlgr_origem,
                form.nro_origem,
                form.xcpl_origem,
                form.xbair_origem,
                form.cep_origem,
              ]
                .filter(Boolean)
                .join(" - ")}
              style={{ ...textAreaStyle, background: "#f8f8f8" }}
            />
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
              <label style={labelStyle}>Código ERP</label>
              <input
                value={form.codigo_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, codigo_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Status envio</label>
              <select
                value={form.status_envio}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status_envio: e.target.value }))
                }
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
            <label style={labelStyle}>CNPJ ERP</label>
            <input
              value={form.cnpj_erp}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, cnpj_erp: onlyDigits(e.target.value) }))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Nome ERP</label>
            <input
              value={form.nome_erp}
              onChange={(e) => setForm((prev) => ({ ...prev, nome_erp: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <label style={labelStyle}>IE ERP</label>
              <input
                value={form.ie_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, ie_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>UF ERP</label>
              <input
                value={form.uf_erp}
                maxLength={2}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, uf_erp: e.target.value.toUpperCase() }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Município ERP</label>
              <input
                value={form.municipio_erp}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, municipio_erp: e.target.value }))
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Logradouro ERP</label>
            <input
              value={form.xlgr_erp}
              onChange={(e) => setForm((prev) => ({ ...prev, xlgr_erp: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr 1fr",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <label style={labelStyle}>Número</label>
              <input
                value={form.nro_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, nro_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Complemento</label>
              <input
                value={form.xcpl_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, xcpl_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Bairro</label>
              <input
                value={form.xbair_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, xbair_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
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
              <label style={labelStyle}>Cód. Município ERP</label>
              <input
                value={form.cmun_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, cmun_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>CEP ERP</label>
              <input
                value={form.cep_erp}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cep_erp: onlyDigits(e.target.value) }))
                }
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Fone ERP</label>
              <input
                value={form.fone_erp}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fone_erp: onlyDigits(e.target.value) }))
                }
                style={inputStyle}
              />
            </div>
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
              <label style={labelStyle}>Cód. País ERP</label>
              <input
                value={form.cpais_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, cpais_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>País ERP</label>
              <input
                value={form.xpais_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, xpais_erp: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>E-mail ERP</label>
              <input
                value={form.email_erp}
                onChange={(e) => setForm((prev) => ({ ...prev, email_erp: e.target.value }))}
                style={inputStyle}
              />
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