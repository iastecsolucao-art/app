import { useEffect, useState } from "react";

const initialState = {
  empresa_id: "",
  ativo: true,
  utiliza_integrador: true,
  verificar_pedido_compra: true,
  verificar_fornecedor: true,
  enviar_sem_pedido_para_stage: true,
  enviar_sem_fornecedor_para_stage: true,
  registrar_depara_sempre: true,
  validar_itens_erp: true,
  bloquear_sem_itens: true,
  integrar_status_erp: true,
  status_inicial_fila: "PENDENTE",
  status_sucesso: "PROCESSADO",
  status_erro: "ERRO",
  status_sem_pedido: "SEM_PEDIDO",
  status_fornecedor_divergente: "FORNECEDOR_DIVERGENTE",
  status_depara_pendente: "DEPARA_PENDENTE",
  status_entrada_realizada: "ENTRADA_REALIZADA",
  observacoes: "",
  cnpjs_destinatarios: "",
};

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCnpjsInput(value) {
  return String(value || "")
    .split(/\r?\n|,|;/)
    .map((item) => onlyDigits(item))
    .filter(Boolean);
}

function formatCnpjsForTextarea(value) {
  if (Array.isArray(value)) {
    return value.join("\n");
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

export default function IntegradorParametrosPage() {
  const [empresas, setEmpresas] = useState([]);
  const [form, setForm] = useState(initialState);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  async function loadEmpresas() {
    setLoadingEmpresas(true);
    setMessage("");

    try {
      const response = await fetch("/api/integrador/parametros", {
        method: "PUT",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao buscar empresas");
      }

      const rows = data.rows || [];
      setEmpresas(rows);

      if (rows.length > 0) {
        setForm((prev) => ({
          ...prev,
          empresa_id: prev.empresa_id || String(rows[0].id),
        }));
      }
    } catch (error) {
      setMessage(error.message || "Erro ao buscar empresas");
      setMessageType("error");
    } finally {
      setLoadingEmpresas(false);
    }
  }

  async function loadData(empresaId) {
    if (!empresaId) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/integrador/parametros?empresa_id=${encodeURIComponent(empresaId)}`
      );

      if (response.status === 404) {
        setForm({
          ...initialState,
          empresa_id: String(empresaId),
        });
        setMessage("Empresa sem parâmetros cadastrados. Preencha e salve.");
        setMessageType("info");
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao buscar parâmetros");
      }

      setForm({
        ...initialState,
        ...data.row,
        empresa_id: String(data.row.empresa_id),
        cnpjs_destinatarios: formatCnpjsForTextarea(
          data.row.cnpjs_destinatarios
        ),
      });
    } catch (error) {
      setMessage(error.message || "Erro ao carregar parâmetros");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmpresas();
  }, []);

  useEffect(() => {
    if (form.empresa_id) {
      loadData(form.empresa_id);
    }
  }, [form.empresa_id]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = {
        ...form,
        empresa_id: Number(form.empresa_id),
        cnpjs_destinatarios: normalizeCnpjsInput(form.cnpjs_destinatarios),
      };

      const response = await fetch("/api/integrador/parametros", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao salvar");
      }

      setForm((prev) => ({
        ...prev,
        ...data.row,
        empresa_id: String(data.row.empresa_id),
        cnpjs_destinatarios: formatCnpjsForTextarea(
          data.row.cnpjs_destinatarios
        ),
      }));

      setMessage("Parâmetros salvos com sucesso.");
      setMessageType("success");
    } catch (error) {
      setMessage(error.message || "Erro ao salvar parâmetros");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  function renderCheckbox(name, label) {
    return (
      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          name={name}
          checked={!!form[name]}
          onChange={handleChange}
        />
        <span>{label}</span>
      </label>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Parâmetros do Integrador</h1>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Empresa</h2>

            <div style={styles.field}>
              <label style={styles.label}>Selecione a empresa</label>
              <select
                name="empresa_id"
                value={form.empresa_id}
                onChange={handleChange}
                style={styles.input}
                disabled={loadingEmpresas}
              >
                <option value="">Selecione</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nome}
                    {empresa.cnpj ? ` - ${empresa.cnpj}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => loadData(form.empresa_id)}
              disabled={loading || !form.empresa_id}
              style={styles.secondaryButton}
            >
              {loading ? "Carregando..." : "Buscar parâmetros"}
            </button>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Regras do processo</h2>

            <div style={styles.checkboxGrid}>
              {renderCheckbox("ativo", "Ativo")}
              {renderCheckbox("utiliza_integrador", "Utiliza integrador")}
              {renderCheckbox("verificar_pedido_compra", "Verificar pedido de compra")}
              {renderCheckbox("verificar_fornecedor", "Verificar fornecedor")}
              {renderCheckbox("enviar_sem_pedido_para_stage", "Enviar sem pedido para stage")}
              {renderCheckbox("enviar_sem_fornecedor_para_stage", "Enviar sem fornecedor para stage")}
              {renderCheckbox("registrar_depara_sempre", "Registrar de/para sempre")}
              {renderCheckbox("validar_itens_erp", "Validar itens no ERP")}
              {renderCheckbox("bloquear_sem_itens", "Bloquear quando não houver itens")}
              {renderCheckbox("integrar_status_erp", "Integrar status ERP")}
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Destinatários permitidos</h2>

            <div style={styles.field}>
              <label style={styles.label}>
                CNPJs dos destinatários participantes da integração
              </label>

              <textarea
                name="cnpjs_destinatarios"
                value={form.cnpjs_destinatarios}
                onChange={handleChange}
                rows={6}
                style={styles.textarea}
                placeholder={`Informe um CNPJ por linha, ou separado por vírgula.\n\nExemplo:\n12345678000199\n11222333000144`}
              />

              <small style={styles.helperText}>
                Aceita um CNPJ por linha, vírgula ou ponto e vírgula. Os caracteres
                não numéricos serão removidos automaticamente ao salvar.
              </small>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Status do fluxo</h2>

            <div style={styles.grid2}>
              <div style={styles.field}>
                <label style={styles.label}>Status inicial fila</label>
                <input
                  type="text"
                  name="status_inicial_fila"
                  value={form.status_inicial_fila}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Status sucesso</label>
                <input
                  type="text"
                  name="status_sucesso"
                  value={form.status_sucesso}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Status erro</label>
                <input
                  type="text"
                  name="status_erro"
                  value={form.status_erro}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Status sem pedido</label>
                <input
                  type="text"
                  name="status_sem_pedido"
                  value={form.status_sem_pedido}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Status fornecedor divergente</label>
                <input
                  type="text"
                  name="status_fornecedor_divergente"
                  value={form.status_fornecedor_divergente}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Status de/para pendente</label>
                <input
                  type="text"
                  name="status_depara_pendente"
                  value={form.status_depara_pendente}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Status entrada realizada</label>
                <input
                  type="text"
                  name="status_entrada_realizada"
                  value={form.status_entrada_realizada}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Observações</h2>

            <div style={styles.field}>
              <label style={styles.label}>Observações</label>
              <textarea
                name="observacoes"
                value={form.observacoes || ""}
                onChange={handleChange}
                rows={5}
                style={styles.textarea}
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button
              type="submit"
              disabled={saving || !form.empresa_id}
              style={styles.primaryButton}
            >
              {saving ? "Salvando..." : "Salvar parâmetros"}
            </button>
          </div>

          {message ? (
            <div
              style={{
                ...styles.message,
                ...(messageType === "error" ? styles.messageError : {}),
                ...(messageType === "success" ? styles.messageSuccess : {}),
              }}
            >
              {message}
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: 24,
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: 1000,
    margin: "0 auto",
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 2px 14px rgba(0,0,0,0.08)",
  },
  title: {
    marginBottom: 24,
    color: "#1d3557",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  section: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 20,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    color: "#243b53",
    fontSize: 20,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 14,
  },
  label: {
    fontWeight: 600,
    color: "#334e68",
  },
  input: {
    height: 42,
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    fontSize: 14,
  },
  textarea: {
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    padding: 12,
    fontSize: 14,
    resize: "vertical",
  },
  helperText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 1.5,
  },
  checkboxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
  },
  primaryButton: {
    height: 44,
    padding: "0 18px",
    borderRadius: 8,
    border: "none",
    background: "#1d4ed8",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryButton: {
    height: 42,
    padding: "0 16px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  message: {
    padding: 12,
    borderRadius: 8,
    background: "#eff6ff",
    color: "#1e3a8a",
  },
  messageError: {
    background: "#fef2f2",
    color: "#991b1b",
  },
  messageSuccess: {
    background: "#ecfdf5",
    color: "#166534",
  },
};