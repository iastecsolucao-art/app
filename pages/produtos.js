import { useState, useEffect } from "react";

export default function CadastroProduto() {
  const [form, setForm] = useState({
    id: "",
    codigo_barra: "",
    descricao: "",
    empresa_id: ""
  });
  const [status, setStatus] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [indexAtual, setIndexAtual] = useState(0);
  const [pesquisa, setPesquisa] = useState("");

  // 📥 Buscar produtos existentes
  useEffect(() => {
    async function fetchProdutos() {
      try {
        const res = await fetch("https://n8n.iastec.servicos.ws/webhook/listar_produtos");
        const data = await res.json();
        const lista = Array.isArray(data)
          ? data.map(item => item.json ? item.json : item)
          : [data];
        setProdutos(lista);
        if (lista.length > 0) setForm(lista[0]);
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
      }
    }
    fetchProdutos();
  }, []);

  // Controle de formulário
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Salvar ou atualizar
  const handleSalvar = async (e) => {
    e.preventDefault();
    setStatus("salvando...");

    const url = form.id
      ? "https://n8n.iastec.servicos.ws/webhook/update_produto"
      : "https://n8n.iastec.servicos.ws/webhook/cadastro_produto";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Erro ao salvar produto");

      setStatus("✅ Produto salvo com sucesso!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Erro ao salvar o produto");
    }
  };

  // Excluir
  const handleExcluir = async () => {
    if (!form.id) return setStatus("⚠️ Nenhum produto selecionado para excluir");

    try {
      const res = await fetch("https://n8n.iastec.servicos.ws/webhook/delete_produto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id }),
      });

      if (!res.ok) throw new Error("Erro ao excluir");

      setStatus("🗑️ Produto excluído!");
      const novaLista = produtos.filter(p => p.id !== form.id);
      setProdutos(novaLista);
      setForm({ id: "", codigo_barra: "", descricao: "", empresa_id: "" });
    } catch (err) {
      console.error(err);
      setStatus("❌ Erro ao excluir o produto");
    }
  };

  // Navegar
  const navegar = (d) => {
    if (produtos.length === 0) return;
    let novo = indexAtual + d;
    if (novo < 0) novo = produtos.length - 1;
    if (novo >= produtos.length) novo = 0;
    setIndexAtual(novo);
    setForm(produtos[novo]);
  };

  // Pesquisar por ID ou Código de Barras
  const handlePesquisar = () => {
    if (!pesquisa) return;
    const encontrado = produtos.find(
      (p) => String(p.id) === pesquisa || String(p.codigo_barra) === pesquisa
    );
    if (encontrado) {
      setForm(encontrado);
      setStatus("🔎 Produto encontrado!");
    } else {
      setStatus("⚠️ Produto não localizado!");
    }
  };

  // Novo registro
  const handleNovo = () => {
    setForm({ id: "", codigo_barra: "", descricao: "", empresa_id: "" });
    setStatus("🆕 Novo produto (preencha e clique Salvar)");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12">
      <h1 className="text-2xl font-bold mb-6">📦 Cadastro de Produto</h1>

{/* 🔎 Pesquisar */}
<div className="mb-4 flex gap-2 items-center">
  <input
    className="border p-2 rounded"
    placeholder="Pesquisar por ID ou Código"
    value={pesquisa}
    onChange={(e) => setPesquisa(e.target.value)}
  />
  <button
    onClick={handlePesquisar}
    className="bg-gray-600 text-white px-3 py-1 rounded"
  >
    Pesquisar
  </button>
  <button
    onClick={handleNovo}
    className="bg-green-600 text-white px-3 py-1 rounded"
  >
    Novo
  </button>
  <button
    onClick={() => setForm({ id: "", codigo_barra: "", descricao: "", empresa_id: "" })}
    className="bg-gray-400 text-white px-3 py-1 rounded"
  >
    Limpar
  </button>
</div>
      <form
        onSubmit={handleSalvar}
        className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-md"
      >
        {form.id && (
          <div className="mb-4">
            <label className="text-sm text-gray-600">ID</label>
            <input
              name="id"
              value={form.id}
              readOnly
              className="w-full bg-gray-100 border p-2 rounded"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Código de Barras</label>
          <input
            name="codigo_barra"
            value={form.codigo_barra}
            onChange={handleChange}
            className="border rounded w-full p-2"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Descrição</label>
          <input
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            className="border rounded w-full p-2"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">Empresa ID</label>
          <input
            name="empresa_id"
            value={form.empresa_id}
            onChange={handleChange}
            className="border rounded w-full p-2"
            required
          />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
            {form.id ? "Atualizar" : "Salvar"}
          </button>
          <button type="button" onClick={handleExcluir} className="bg-red-600 text-white px-4 py-2 rounded">
            Excluir
          </button>
        </div>

        <div className="flex justify-between mt-4">
          <button type="button" onClick={() => navegar(-1)} className="px-3 py-1 bg-gray-300 rounded">⏮️ Anterior</button>
          <button type="button" onClick={() => navegar(1)} className="px-3 py-1 bg-gray-300 rounded">Próximo ⏭️</button>
        </div>

        {status && <p className="mt-4 text-center">{status}</p>}
      </form>
    </div>
  );
}