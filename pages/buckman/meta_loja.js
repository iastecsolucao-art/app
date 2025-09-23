import { useState, useEffect } from "react";

export default function Metas() {
  const [metas, setMetas] = useState([]);
  const [form, setForm] = useState({
    id: null,
    codigo: "",
    loja: "",
    semana1: "",
    semana2: "",
    semana3: "",
    semana4: "",
  });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  const fetchMetas = async (pageNumber = 1, searchTerm = "") => {
    setLoading(true);
    const res = await fetch(
      `/api/buckman/metas?q=${encodeURIComponent(searchTerm)}&page=${pageNumber}&limit=${limit}`
    );
    const data = await res.json();
    setMetas(data.items);
    setPage(data.currentPage);
    setTotalPages(data.totalPages);
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
      semana1: parseFloat(form.semana1) || 0,
      semana2: parseFloat(form.semana2) || 0,
      semana3: parseFloat(form.semana3) || 0,
      semana4: parseFloat(form.semana4) || 0,
    });

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
        semana1: "",
        semana2: "",
        semana3: "",
        semana4: "",
      });
      fetchMetas(page, search);
    } else {
      alert("Erro ao salvar meta");
    }
  };

  const handleEdit = (meta) => {
    setForm({
      id: meta.id,
      codigo: meta.codigo.toString(),
      loja: meta.loja,
      semana1: meta.semana1.toString(),
      semana2: meta.semana2.toString(),
      semana3: meta.semana3.toString(),
      semana4: meta.semana4.toString(),
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Confirma exclusão da meta?")) return;
    const res = await fetch(`/api/buckman/metas?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchMetas(page, search);
    } else {
      alert("Erro ao deletar meta");
    }
  };

  const handleNew = () => {
    setForm({
      id: null,
      codigo: "",
      loja: "",
      semana1: "",
      semana2: "",
      semana3: "",
      semana4: "",
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Manutenção de Metas das Lojas</h1>

      {/* Pesquisa */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Pesquisar por loja"
          value={search}
          onChange={handleSearchChange}
          style={{ marginRight: 10 }}
        />
        <button type="submit">Pesquisar</button>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            fetchMetas(1, "");
          }}
          style={{ marginLeft: 10 }}
        >
          Limpar
        </button>
      </form>

      {/* Formulário */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <input
          name="codigo"
          placeholder="Código"
          value={form.codigo}
          onChange={handleChange}
          required
          style={{ marginRight: 10, width: 100 }}
          type="number"
        />
        <input
          name="loja"
          placeholder="Loja"
          value={form.loja}
          onChange={handleChange}
          required
          style={{ marginRight: 10 }}
        />
        <input
          name="semana1"
          type="number"
          step="0.01"
          placeholder="Semana 1"
          value={form.semana1}
          onChange={handleChange}
          style={{ marginRight: 10, width: 80 }}
        />
        <input
          name="semana2"
          type="number"
          step="0.01"
          placeholder="Semana 2"
          value={form.semana2}
          onChange={handleChange}
          style={{ marginRight: 10, width: 80 }}
        />
        <input
          name="semana3"
          type="number"
          step="0.01"
          placeholder="Semana 3"
          value={form.semana3}
          onChange={handleChange}
          style={{ marginRight: 10, width: 80 }}
        />
        <input
          name="semana4"
          type="number"
          step="0.01"
          placeholder="Semana 4"
          value={form.semana4}
          onChange={handleChange}
          style={{ marginRight: 10, width: 80 }}
        />
        <button type="submit">{form.id ? "Atualizar" : "Adicionar"}</button>
        <button type="button" onClick={handleNew} style={{ marginLeft: 10 }}>
          Novo
        </button>
      </form>

      {/* Tabela */}
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          <table border="1" cellPadding="5" cellSpacing="0" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Código</th>
                <th>Loja</th>
                <th>Semana 1</th>
                <th>Semana 2</th>
                <th>Semana 3</th>
                <th>Semana 4</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {metas.map((meta) => (
                <tr key={meta.id}>
                  <td>{meta.id}</td>
                  <td>{meta.codigo}</td>
                  <td>{meta.loja}</td>
                  <td>{meta.semana1}</td>
                  <td>{meta.semana2}</td>
                  <td>{meta.semana3}</td>
                  <td>{meta.semana4}</td>
                  <td>
                    <button onClick={() => handleEdit(meta)} style={{ marginRight: 5 }}>
                      Editar
                    </button>
                    <button onClick={() => handleDelete(meta.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 10 }}>
            <button onClick={() => fetchMetas(page - 1, search)} disabled={page <= 1 || loading}>
              Anterior
            </button>
            <span style={{ margin: "0 10px" }}>
              Página {page} de {totalPages}
            </span>
            <button onClick={() => fetchMetas(page + 1, search)} disabled={page >= totalPages || loading}>
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}