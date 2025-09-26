import { useState, useEffect } from "react";

export default function Metas() {
  const [metas, setMetas] = useState([]);
  const [form, setForm] = useState({
    id: null,
    codigo: "",
    loja: "",
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    semana1: "",
    semana2: "",
    semana3: "",
    semana4: "",
    semana5: "",
    semana6: "",
    cota_vendedor: "",
    super_cota: "",
    cota_ouro: "",
    comissao_loja: "",
    qtd_vendedor: "",
    valor_cota: "",
    valor_super_cota: "",
    valor_cota_ouro: "",
    cota_semana1: "",
    cota_semana2: "",
    cota_semana3: "",
    cota_semana4: "",
    cota_semana5: "",
    cota_semana6: "",
    semana1_qtd_vendedor: "",
    semana2_qtd_vendedor: "",
    semana3_qtd_vendedor: "",
    semana4_qtd_vendedor: "",
    semana5_qtd_vendedor: "",
    semana6_qtd_vendedor: "",
  });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("geral");
  const limit = 10;

  const fetchMetas = async (pageNumber = 1, searchTerm = "") => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/buckman/metas?q=${encodeURIComponent(searchTerm)}&page=${pageNumber}&limit=${limit}`
      );
      const data = await res.json();
      setMetas(data.items);
      setPage(data.currentPage);
      setTotalPages(data.totalPages);
    } catch (error) {
      alert("Erro ao carregar metas");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMetas(page, search);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMetas(1, search);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = form.id ? "PUT" : "POST";
    const url = "/api/buckman/metas";
    const body = JSON.stringify({
      id: form.id,
      codigo: parseInt(form.codigo, 10),
      loja: form.loja,
      mes: parseInt(form.mes, 10),
      ano: parseInt(form.ano, 10),
      semana1: parseFloat(form.semana1) || 0,
      semana2: parseFloat(form.semana2) || 0,
      semana3: parseFloat(form.semana3) || 0,
      semana4: parseFloat(form.semana4) || 0,
      semana5: parseFloat(form.semana5) || 0,
      semana6: parseFloat(form.semana6) || 0,
      cota_vendedor: parseFloat(form.cota_vendedor) || 0,
      super_cota: parseFloat(form.super_cota) || 0,
      cota_ouro: parseFloat(form.cota_ouro) || 0,
      comissao_loja: parseFloat(form.comissao_loja) || 0,
      qtd_vendedor: parseInt(form.qtd_vendedor, 10) || 0,
      valor_cota: parseFloat(form.valor_cota) || 0,
      valor_super_cota: parseFloat(form.valor_super_cota) || 0,
      valor_cota_ouro: parseFloat(form.valor_cota_ouro) || 0,
      cota_semana1: parseFloat(form.cota_semana1) || 0,
      cota_semana2: parseFloat(form.cota_semana2) || 0,
      cota_semana3: parseFloat(form.cota_semana3) || 0,
      cota_semana4: parseFloat(form.cota_semana4) || 0,
      cota_semana5: parseFloat(form.cota_semana5) || 0,
      cota_semana6: parseFloat(form.cota_semana6) || 0,
      semana1_qtd_vendedor: parseInt(form.semana1_qtd_vendedor, 10) || 0,
      semana2_qtd_vendedor: parseInt(form.semana2_qtd_vendedor, 10) || 0,
      semana3_qtd_vendedor: parseInt(form.semana3_qtd_vendedor, 10) || 0,
      semana4_qtd_vendedor: parseInt(form.semana4_qtd_vendedor, 10) || 0,
      semana5_qtd_vendedor: parseInt(form.semana5_qtd_vendedor, 10) || 0,
      semana6_qtd_vendedor: parseInt(form.semana6_qtd_vendedor, 10) || 0,
    });

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.ok) {
        setForm({
          id: null,
          codigo: "",
          loja: "",
          mes: new Date().getMonth() + 1,
          ano: new Date().getFullYear(),
          semana1: "",
          semana2: "",
          semana3: "",
          semana4: "",
          semana5: "",
          semana6: "",
          cota_vendedor: "",
          super_cota: "",
          cota_ouro: "",
          comissao_loja: "",
          qtd_vendedor: "",
          valor_cota: "",
          valor_super_cota: "",
          valor_cota_ouro: "",
          cota_semana1: "",
          cota_semana2: "",
          cota_semana3: "",
          cota_semana4: "",
          cota_semana5: "",
          cota_semana6: "",
          semana1_qtd_vendedor: "",
          semana2_qtd_vendedor: "",
          semana3_qtd_vendedor: "",
          semana4_qtd_vendedor: "",
          semana5_qtd_vendedor: "",
          semana6_qtd_vendedor: "",
        });
        fetchMetas(page, search);
      } else {
        alert("Erro ao salvar meta");
      }
    } catch (error) {
      alert("Erro na comunicação com o servidor");
    }
  };

  const handleEdit = (meta) => {
    setForm({
      id: meta.id,
      codigo: meta.codigo.toString(),
      loja: meta.loja,
      mes: meta.mes || new Date().getMonth() + 1,
      ano: meta.ano || new Date().getFullYear(),
      semana1: meta.semana1?.toString() || "",
      semana2: meta.semana2?.toString() || "",
      semana3: meta.semana3?.toString() || "",
      semana4: meta.semana4?.toString() || "",
      semana5: meta.semana5?.toString() || "",
      semana6: meta.semana6?.toString() || "",
      cota_vendedor: meta.cota_vendedor?.toString() || "",
      super_cota: meta.super_cota?.toString() || "",
      cota_ouro: meta.cota_ouro?.toString() || "",
      comissao_loja: meta.comissao_loja?.toString() || "",
      qtd_vendedor: meta.qtd_vendedor?.toString() || "",
      valor_cota: meta.valor_cota?.toString() || "",
      valor_super_cota: meta.valor_super_cota?.toString() || "",
      valor_cota_ouro: meta.valor_cota_ouro?.toString() || "",
      cota_semana1: meta.cota_semana1?.toString() || "",
      cota_semana2: meta.cota_semana2?.toString() || "",
      cota_semana3: meta.cota_semana3?.toString() || "",
      cota_semana4: meta.cota_semana4?.toString() || "",
      cota_semana5: meta.cota_semana5?.toString() || "",
      cota_semana6: meta.cota_semana6?.toString() || "",
      semana1_qtd_vendedor: meta.semana1_qtd_vendedor?.toString() || "",
      semana2_qtd_vendedor: meta.semana2_qtd_vendedor?.toString() || "",
      semana3_qtd_vendedor: meta.semana3_qtd_vendedor?.toString() || "",
      semana4_qtd_vendedor: meta.semana4_qtd_vendedor?.toString() || "",
      semana5_qtd_vendedor: meta.semana5_qtd_vendedor?.toString() || "",
      semana6_qtd_vendedor: meta.semana6_qtd_vendedor?.toString() || "",
    });
    setActiveTab("geral");
  };

  const handleDelete = async (id) => {
    if (!confirm("Confirma exclusão da meta?")) return;
    try {
      const res = await fetch(`/api/buckman/metas?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchMetas(page, search);
      } else {
        alert("Erro ao deletar meta");
      }
    } catch (error) {
      alert("Erro na comunicação com o servidor");
    }
  };

  const handleNew = () => {
    setForm({
      id: null,
      codigo: "",
      loja: "",
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear(),
      semana1: "",
      semana2: "",
      semana3: "",
      semana4: "",
      semana5: "",
      semana6: "",
      cota_vendedor: "",
      super_cota: "",
      cota_ouro: "",
      comissao_loja: "",
      qtd_vendedor: "",
      valor_cota: "",
      valor_super_cota: "",
      valor_cota_ouro: "",
      cota_semana1: "",
      cota_semana2: "",
      cota_semana3: "",
      cota_semana4: "",
      cota_semana5: "",
      cota_semana6: "",
      semana1_qtd_vendedor: "",
      semana2_qtd_vendedor: "",
      semana3_qtd_vendedor: "",
      semana4_qtd_vendedor: "",
      semana5_qtd_vendedor: "",
      semana6_qtd_vendedor: "",
    });
    setActiveTab("geral");
  };

  return (
    <div style={{ padding: 20, fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <h1 style={{ marginBottom: 20, color: "#2c3e50" }}>Manutenção de Metas das Lojas</h1>

      {/* Pesquisa */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: 20, display: "flex", gap: 10 }}>
        <input
          type="text"
          placeholder="Pesquisar por loja"
          value={search}
          onChange={handleSearchChange}
          style={{
            flexGrow: 1,
            padding: "8px 12px",
            borderRadius: 4,
            border: "1px solid #ccc",
            fontSize: 14,
          }}
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
          Pesquisar
        </button>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            fetchMetas(1, "");
          }}
          style={{
            padding: "8px 16px",
            backgroundColor: "#7f8c8d",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Limpar
        </button>
      </form>

      {/* Abas */}
      <div style={{ marginBottom: 15, display: "flex", gap: 10 }}>
        <button
          onClick={() => setActiveTab("geral")}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            border: activeTab === "geral" ? "2px solid #2980b9" : "1px solid #ccc",
            backgroundColor: activeTab === "geral" ? "#d6e9ff" : "white",
            cursor: "pointer",
          }}
        >
          Dados Gerais
        </button>
        <button
          onClick={() => setActiveTab("semanas")}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            border: activeTab === "semanas" ? "2px solid #2980b9" : "1px solid #ccc",
            backgroundColor: activeTab === "semanas" ? "#d6e9ff" : "white",
            cursor: "pointer",
          }}
        >
          Metas Semanais
        </button>
        <button
          onClick={() => setActiveTab("vendedores")}
          style={{
            padding: "8px 16px",
            borderRadius: 4,
            border: activeTab === "vendedores" ? "2px solid #2980b9" : "1px solid #ccc",
            backgroundColor: activeTab === "vendedores" ? "#d6e9ff" : "white",
            cursor: "pointer",
          }}
        >
          Vendedores
        </button>
      </div>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        style={{
          marginBottom: 30,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 15,
          backgroundColor: "#ecf0f1",
          padding: 20,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        {activeTab === "geral" && (
          <>
            <input
              name="codigo"
              placeholder="Código"
              value={form.codigo}
              onChange={handleChange}
              required
              type="number"
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              name="loja"
              placeholder="Loja"
              value={form.loja}
              onChange={handleChange}
              required
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              name="mes"
              type="number"
              min="1"
              max="12"
              placeholder="Mês"
              value={form.mes}
              onChange={handleChange}
              required
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              name="ano"
              type="number"
              min="2000"
              max="2100"
              placeholder="Ano"
              value={form.ano}
              onChange={handleChange}
              required
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />

            <input
              name="cota_vendedor"
              type="number"
              step="0.01"
              placeholder="% Cota Vendedor"
              value={form.cota_vendedor}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              name="super_cota"
              type="number"
              step="0.01"
              placeholder="% Super Cota"
              value={form.super_cota}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              name="cota_ouro"
              type="number"
              step="0.01"
              placeholder="% Cota Ouro"
              value={form.cota_ouro}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              name="comissao_loja"
              type="number"
              step="0.01"
              placeholder="% Comissão Loja"
              value={form.comissao_loja}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              name="valor_cota"
              type="number"
              step="0.01"
              placeholder="Valor Cota"
              value={form.valor_cota}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              name="valor_super_cota"
              type="number"
              step="0.01"
              placeholder="Valor Super Cota"
              value={form.valor_super_cota}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              name="valor_cota_ouro"
              type="number"
              step="0.01"
              placeholder="Valor Cota Ouro"
              value={form.valor_cota_ouro}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
          </>
        )}

        {activeTab === "semanas" && (
          <>
            {[1, 2, 3, 4, 5, 6].map((sem) => (
              <input
                key={`semana${sem}`}
                name={`semana${sem}`}
                type="number"
                step="0.01"
                placeholder={`Semana ${sem}`}
                value={form[`semana${sem}`]}
                onChange={handleChange}
                style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              />
            ))}

            {[1, 2, 3, 4, 5, 6].map((sem) => (
              <input
                key={`cota_semana${sem}`}
                name={`cota_semana${sem}`}
                type="number"
                step="0.01"
                placeholder={`Cota Semana ${sem}`}
                value={form[`cota_semana${sem}`]}
                onChange={handleChange}
                style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              />
            ))}
          </>
        )}

        {activeTab === "vendedores" && (
          <>
            <input
              name="qtd_vendedor"
              type="number"
              placeholder="Qtd Vendedor"
              value={form.qtd_vendedor}
              onChange={handleChange}
              style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
            />
            {[1, 2, 3, 4, 5, 6].map((sem) => (
              <input
                key={`semana_qtd_vendedor${sem}`}
                name={`semana${sem}_qtd_vendedor`}
                type="number"
                placeholder={`Qtd Vendedor Semana ${sem}`}
                value={form[`semana${sem}_qtd_vendedor`]}
                onChange={handleChange}
                style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
              />
            ))}
          </>
        )}

        <div style={{ gridColumn: "span 2", display: "flex", gap: "10px" }}>
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
            onClick={handleNew}
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
        <>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#2980b9", color: "white" }}>
                {/* Colunas fixas */}
                <th style={{ padding: 8, border: "1px solid #ddd" }}>ID</th>
                <th style={{ padding: 8, border: "1px solid #ddd" }}>Código</th>
                <th style={{ padding: 8, border: "1px solid #ddd" }}>Loja</th>
                <th style={{ padding: 8, border: "1px solid #ddd" }}>Mês</th>
                <th style={{ padding: 8, border: "1px solid #ddd" }}>Ano</th>

                {activeTab === "geral" && (
                  <>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>% Cota Vendedor</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>% Super Cota</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>% Cota Ouro</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>% Comissão Loja</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Valor Cota</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Valor Super Cota</th>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Valor Cota Ouro</th>
                  </>
                )}

                {activeTab === "semanas" && (
                  <>
                    {[1, 2, 3, 4, 5, 6].map((sem) => (
                      <th key={`header_semana_${sem}`} style={{ padding: 8, border: "1px solid #ddd" }}>
                        Semana {sem}
                      </th>
                    ))}
                    {[1, 2, 3, 4, 5, 6].map((sem) => (
                      <th key={`header_cota_semana_${sem}`} style={{ padding: 8, border: "1px solid #ddd" }}>
                        Cota Semana {sem}
                      </th>
                    ))}
                  </>
                )}

                {activeTab === "vendedores" && (
                  <>
                    <th style={{ padding: 8, border: "1px solid #ddd" }}>Qtd Vendedor</th>
                    {[1, 2, 3, 4, 5, 6].map((sem) => (
                      <th key={`qtd_vendedor_semana_${sem}`} style={{ padding: 8, border: "1px solid #ddd" }}>
                        Qtd Vendedor S{sem}
                      </th>
                    ))}
                  </>
                )}

                <th style={{ padding: 8, border: "1px solid #ddd" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {metas.map((meta) => (
                <tr key={meta.id} style={{ borderBottom: "1px solid #ddd" }}>
                  {/* Colunas fixas */}
                  <td style={{ padding: 8, textAlign: "center" }}>{meta.id}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{meta.codigo}</td>
                  <td style={{ padding: 8 }}>{meta.loja}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{meta.mes}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>{meta.ano}</td>

                  {activeTab === "geral" && (
                    <>
                      <td style={{ padding: 8, textAlign: "right" }}>{meta.cota_vendedor}</td>
                      <td style={{ padding: 8, textAlign: "right" }}>{meta.super_cota}</td>
                      <td style={{ padding: 8, textAlign: "right" }}>{meta.cota_ouro}</td>
                      <td style={{ padding: 8, textAlign: "right" }}>{meta.comissao_loja}</td>
                      <td style={{ padding: 8, textAlign: "right" }}>{meta.valor_cota}</td>
                      <td style={{ padding: 8, textAlign: "right" }}>{meta.valor_super_cota}</td>
                      <td style={{ padding: 8, textAlign: "right" }}>{meta.valor_cota_ouro}</td>
                    </>
                  )}

                  {activeTab === "semanas" && (
                    <>
                      {[1, 2, 3, 4, 5, 6].map((sem) => (
                        <td key={`semana_valor_${sem}_${meta.id}`} style={{ padding: 8, textAlign: "right" }}>
                          {meta[`semana${sem}`]}
                        </td>
                      ))}
                      {[1, 2, 3, 4, 5, 6].map((sem) => (
                        <td key={`cota_semana_valor_${sem}_${meta.id}`} style={{ padding: 8, textAlign: "right" }}>
                          {meta[`cota_semana${sem}`]}
                        </td>
                      ))}
                    </>
                  )}

                  {activeTab === "vendedores" && (
                    <>
                      <td style={{ padding: 8, textAlign: "right" }}>{meta.qtd_vendedor}</td>
                      {[1, 2, 3, 4, 5, 6].map((sem) => (
                        <td key={`qtd_vendedor_valor_${sem}_${meta.id}`} style={{ padding: 8, textAlign: "right" }}>
                          {meta[`semana${sem}_qtd_vendedor`]}
                        </td>
                      ))}
                    </>
                  )}

                  <td style={{ padding: 8, textAlign: "center" }}>
                    <button
                      onClick={() => handleEdit(meta)}
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
                      onClick={() => handleDelete(meta.id)}
                      style={{
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação */}
          <div style={{ marginTop: 15, display: "flex", justifyContent: "center", gap: 10 }}>
            <button
              onClick={() => fetchMetas(page - 1, search)}
              disabled={page <= 1 || loading}
              style={{
                padding: "8px 16px",
                backgroundColor: page <= 1 || loading ? "#bdc3c7" : "#2980b9",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: page <= 1 || loading ? "not-allowed" : "pointer",
              }}
            >
              Anterior
            </button>
            <span style={{ alignSelf: "center" }}>
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => fetchMetas(page + 1, search)}
              disabled={page >= totalPages || loading}
              style={{
                padding: "8px 16px",
                backgroundColor: page >= totalPages || loading ? "#bdc3c7" : "#2980b9",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: page >= totalPages || loading ? "not-allowed" : "pointer",
              }}
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}