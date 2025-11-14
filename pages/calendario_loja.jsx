import { useState, useEffect } from "react";

export default function CalendarioLoja() {
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState({
    id: null,
    ano: new Date().getFullYear(),
    semana: "",
    loja: "",
    meta: "",
    qtd_vendedor: "",
    cota: "",
    abaixo: "",
    super_cota: "",
    cota_ouro: "",
    obs: "",
  });
  const [loading, setLoading] = useState(false);
  const [searchLoja, setSearchLoja] = useState("");
  const [searchAno, setSearchAno] = useState(new Date().getFullYear());

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchAno) params.append("ano", searchAno);
      if (searchLoja) params.append("loja", searchLoja);

      const res = await fetch(`/api/calendario/calendario_loja?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar dados");

      setRegistros(data);
    } catch (error) {
      alert(error.message || "Erro ao carregar dados");
      setRegistros([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRegistros();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRegistros();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const method = form.id ? "PUT" : "POST";

    const body = JSON.stringify({
      id: form.id,
      ano: parseInt(form.ano, 10),
      semana: parseInt(form.semana, 10),
      loja: form.loja,
      meta: form.meta === "" ? null : parseFloat(form.meta),
      qtd_vendedor: form.qtd_vendedor === "" ? null : parseInt(form.qtd_vendedor, 10),
      cota: form.cota === "" ? null : parseFloat(form.cota),
      abaixo: form.abaixo === "" ? null : parseFloat(form.abaixo),
      super_cota: form.super_cota === "" ? null : parseFloat(form.super_cota),
      cota_ouro: form.cota_ouro === "" ? null : parseFloat(form.cota_ouro),
      obs: form.obs || null,
    });

    try {
      const res = await fetch("/api/calendario/calendario_loja", {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar registro");

      // limpa form
      setForm({
        id: null,
        ano: new Date().getFullYear(),
        semana: "",
        loja: "",
        meta: "",
        qtd_vendedor: "",
        cota: "",
        abaixo: "",
        super_cota: "",
        cota_ouro: "",
        obs: "",
      });

      fetchRegistros();
    } catch (error) {
      alert(error.message || "Erro ao salvar registro");
    }
    setLoading(false);
  };

  const handleEdit = (reg) => {
    setForm({
      id: reg.id,
      ano: reg.ano,
      semana: reg.semana,
      loja: reg.loja,
      meta: reg.meta?.toString() || "",
      qtd_vendedor: reg.qtd_vendedor?.toString() || "",
      cota: reg.cota?.toString() || "",
      abaixo: reg.abaixo?.toString() || "",
      super_cota: reg.super_cota?.toString() || "",
      cota_ouro: reg.cota_ouro?.toString() || "",
      obs: reg.obs || "",
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Confirma exclusão do registro?")) return;

    try {
      const res = await fetch(`/api/calendario/calendario_loja`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Erro ao excluir registro");

      fetchRegistros();
    } catch (error) {
      alert(error.message || "Erro ao excluir registro");
    }
  };

  // ---------------------------
  // 🚀 NOVA FUNÇÃO COPIAR
  // ---------------------------
  const handleCopy = async (reg) => {
    const texto = `
ID gerado: ${reg.id}
Ano: ${reg.ano}
Semana: ${reg.semana}
Loja: ${reg.loja}
Meta: ${reg.meta}
Qtd Vendedor: ${reg.qtd_vendedor}
Cota: ${reg.cota}
Abaixo: ${reg.abaixo}
Super Cota: ${reg.super_cota}
Cota Ouro: ${reg.cota_ouro}
`.trim();

    try {
      await navigator.clipboard.writeText(texto);
      alert(`Copiado! ID gerado: ${reg.id}`);
    } catch (error) {
      alert("Erro ao copiar");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Metas por Semana / Loja</h1>

      {/* Pesquisa */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: 20, display: "flex", gap: 10 }}>
        <input
          type="number"
          placeholder="Ano"
          value={searchAno}
          onChange={(e) => setSearchAno(e.target.value)}
          style={{ width: 100, padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <input
          type="text"
          placeholder="Loja"
          value={searchLoja}
          onChange={(e) => setSearchLoja(e.target.value)}
          style={{ flexGrow: 1, padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            backgroundColor: "#2980b9",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Buscar
        </button>
      </form>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        style={{
          marginBottom: 30,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
          backgroundColor: "#ecf0f1",
          padding: 15,
          borderRadius: 8,
        }}
      >
        <input name="ano" type="number" placeholder="Ano" value={form.ano} onChange={handleChange} required />
        <input name="semana" type="number" placeholder="Semana" value={form.semana} onChange={handleChange} required />
        <input name="loja" placeholder="Loja" value={form.loja} onChange={handleChange} required />

        <input name="meta" type="number" step="0.01" placeholder="Meta" value={form.meta} onChange={handleChange} />
        <input name="qtd_vendedor" type="number" placeholder="Qtd Vendedor" value={form.qtd_vendedor} onChange={handleChange} />
        <input name="cota" type="number" step="0.01" placeholder="Cota" value={form.cota} onChange={handleChange} />
        <input name="abaixo" type="number" step="0.01" placeholder="Abaixo" value={form.abaixo} onChange={handleChange} />
        <input name="super_cota" type="number" step="0.01" placeholder="Super Cota" value={form.super_cota} onChange={handleChange} />
        <input name="cota_ouro" type="number" step="0.01" placeholder="Cota Ouro" value={form.cota_ouro} onChange={handleChange} />

        <input
          name="obs"
          placeholder="Observação"
          value={form.obs}
          onChange={handleChange}
          style={{ gridColumn: "1 / -1" }}
        />

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
          <button
            type="submit"
            style={{
              flexGrow: 1,
              padding: "10px",
              backgroundColor: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {form.id ? "Atualizar" : "Adicionar"}
          </button>

          <button
            type="button"
            onClick={() =>
              setForm({
                id: null,
                ano: new Date().getFullYear(),
                semana: "",
                loja: "",
                meta: "",
                qtd_vendedor: "",
                cota: "",
                abaixo: "",
                super_cota: "",
                cota_ouro: "",
                obs: "",
              })
            }
            style={{
              flexGrow: 1,
              padding: "10px",
              backgroundColor: "#c0392b",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Novo
          </button>
        </div>
      </form>

      {/* Tabela */}
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: "#2980b9", color: "white" }}>
              <th style={{ padding: 6 }}>ID</th>
              <th style={{ padding: 6 }}>Ano</th>
              <th style={{ padding: 6 }}>Semana</th>
              <th style={{ padding: 6 }}>Loja</th>
              <th style={{ padding: 6 }}>Meta</th>
              <th style={{ padding: 6 }}>Qtd Vend.</th>
              <th style={{ padding: 6 }}>Cota</th>
              <th style={{ padding: 6 }}>Abaixo</th>
              <th style={{ padding: 6 }}>Super Cota</th>
              <th style={{ padding: 6 }}>Cota Ouro</th>
              <th style={{ padding: 6 }}>Obs</th>
              <th style={{ padding: 6 }}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {registros.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: 6, textAlign: "center" }}>{r.id}</td>
                <td style={{ padding: 6, textAlign: "center" }}>{r.ano}</td>
                <td style={{ padding: 6, textAlign: "center" }}>{r.semana}</td>
                <td style={{ padding: 6 }}>{r.loja}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{r.meta}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{r.qtd_vendedor}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{r.cota}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{r.abaixo}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{r.super_cota}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{r.cota_ouro}</td>
                <td style={{ padding: 6 }}>{r.obs}</td>

                <td style={{ padding: 6, textAlign: "center" }}>
                  <button
                    onClick={() => handleEdit(r)}
                    style={{
                      marginRight: 5,
                      padding: "4px 8px",
                      backgroundColor: "#2980b9",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => handleDelete(r.id)}
                    style={{
                      marginRight: 5,
                      padding: "4px 8px",
                      backgroundColor: "#c0392b",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Excluir
                  </button>

                  <button
                    onClick={() => handleCopy(r)}
                    style={{
                      padding: "4px 8px",
                      backgroundColor: "#27ae60",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Copiar
                  </button>
                </td>
              </tr>
            ))}

            {!registros.length && (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: 10 }}>
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
