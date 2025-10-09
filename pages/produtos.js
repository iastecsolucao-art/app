import { useState, useEffect } from "react";

export default function CadastroProduto() {
  const [form, setForm] = useState({
    id: "",
    codigo_barra: "",
    descricao: "",
    custo: "",
    preco: "",
    categoria: "",
    empresa_id: "",
    foto_url: "",     // NOVO
    ativo_loja: true, // NOVO
  });

  const [status, setStatus] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [indexAtual, setIndexAtual] = useState(0);
  const [pesquisa, setPesquisa] = useState("");

  // ------- helpers -------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : (value ?? "") }));
  };

  const normalizeMoney = (v) => {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return v;
    const n = String(v).replace(/\./g, "").replace(",", ".").trim();
    const p = parseFloat(n);
    return isNaN(p) ? 0 : p;
  };

  const carregarPrimeiro = (lista) => {
    if (lista.length === 0) {
      setForm({
        id: "",
        codigo_barra: "",
        descricao: "",
        custo: "",
        preco: "",
        categoria: "",
        empresa_id: "",
        foto_url: "",
        ativo_loja: true,
      });
      setIndexAtual(0);
      return;
    }
    const p = lista[0];
    setForm({
      id: p.id ?? "",
      codigo_barra: p.codigo_barra ?? "",
      descricao: p.descricao ?? "",
      custo: p.custo ?? "",
      preco: p.preco ?? "",
      categoria: p.categoria ?? "",
      empresa_id: p.empresa_id ?? "",
      foto_url: p.foto_url ?? "",
      ativo_loja: p.ativo_loja ?? true,
    });
    setIndexAtual(0);
  };

  // ------- load inicial -------
  useEffect(() => {
    (async function fetchProdutos() {
      try {
        const res = await fetch(`/api/produtos`, { credentials: "include" });
        if (!res.ok) throw new Error("Erro ao carregar produtos");
        const data = await res.json();
        setProdutos(data);
        carregarPrimeiro(data);
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
        setStatus("❌ Erro ao carregar produtos");
      }
    })();
  }, []);

  const fetchProdutosAtualizados = async () => {
    try {
      const res = await fetch(`/api/produtos`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao atualizar produtos");
      const data = await res.json();
      setProdutos(data);
      return data;
    } catch (err) {
      console.error("Erro ao atualizar produtos:", err);
      setStatus("❌ Erro ao atualizar produtos");
      return produtos;
    }
  };

  // ------- upload de foto -------
  const handleUploadFoto = async (file) => {
    if (!file) return;
    setStatus("Enviando foto...");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Falha no upload");
      setForm((f) => ({ ...f, foto_url: data.url }));
      setStatus("📸 Foto enviada!");
    } catch (e) {
      console.error(e);
      setStatus("❌ Erro no upload: " + e.message);
    }
  };

  // ------- CRUD -------
  const handleSalvar = async (e) => {
    e.preventDefault();
    setStatus("salvando...");

    const url = "/api/produtos";
    const method = form.id ? "PUT" : "POST";

    const payload = {
      ...form,
      custo: normalizeMoney(form.custo),
      preco: normalizeMoney(form.preco),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar produto");

      setStatus("✅ Produto salvo com sucesso!");
      const lista = await fetchProdutosAtualizados();
      carregarPrimeiro(lista);
    } catch (err) {
      console.error(err);
      setStatus("❌ Erro ao salvar o produto");
    }
  };

  const handleExcluir = async () => {
    if (!form.id) return setStatus("⚠️ Nenhum produto selecionado para excluir");
    try {
      const res = await fetch(`/api/produtos/${form.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao excluir");

      setStatus("🗑️ Produto excluído!");
      const nova = produtos.filter((p) => p.id !== form.id);
      setProdutos(nova);
      carregarPrimeiro(nova);
    } catch (err) {
      console.error(err);
      setStatus("❌ Erro ao excluir o produto");
    }
  };

  const navegar = (d) => {
    if (produtos.length === 0) return;
    let novo = indexAtual + d;
    if (novo < 0) novo = produtos.length - 1;
    if (novo >= produtos.length) novo = 0;
    setIndexAtual(novo);
    const p = produtos[novo];
    setForm({
      id: p.id ?? "",
      codigo_barra: p.codigo_barra ?? "",
      descricao: p.descricao ?? "",
      custo: p.custo ?? "",
      preco: p.preco ?? "",
      categoria: p.categoria ?? "",
      empresa_id: p.empresa_id ?? "",
      foto_url: p.foto_url ?? "",
      ativo_loja: p.ativo_loja ?? true,
    });
  };

  const handlePesquisar = async () => {
    if (!pesquisa) return setStatus("⚠️ Informe um valor para pesquisar");
    setStatus("Pesquisando...");
    try {
      const res = await fetch(`/api/produtos?q=${encodeURIComponent(pesquisa)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro na pesquisa");
      const data = await res.json();
      if (data.length > 0) {
        const p = data[0];
        setForm({
          id: p.id ?? "",
          codigo_barra: p.codigo_barra ?? "",
          descricao: p.descricao ?? "",
          custo: p.custo ?? "",
          preco: p.preco ?? "",
          categoria: p.categoria ?? "",
          empresa_id: p.empresa_id ?? "",
          foto_url: p.foto_url ?? "",
          ativo_loja: p.ativo_loja ?? true,
        });
        setStatus(`🔎 Produto encontrado: ${p.descricao}`);
        setProdutos(data);
        setIndexAtual(0);
      } else {
        setStatus("⚠️ Produto não localizado!");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Erro ao pesquisar produto");
    }
  };

  const handleNovo = () => {
    setForm({
      id: "",
      codigo_barra: "",
      descricao: "",
      custo: "",
      preco: "",
      categoria: "",
      empresa_id: "",
      foto_url: "",
      ativo_loja: true,
    });
    setStatus("🆕 Novo produto (preencha e clique Salvar)");
  };

  const handleLimpar = () => {
    setForm({
      id: "",
      codigo_barra: "",
      descricao: "",
      custo: "",
      preco: "",
      categoria: "",
      empresa_id: form.empresa_id,
      foto_url: "",
      ativo_loja: true,
    });
    setStatus(null);
    setPesquisa("");
  };

  // ------- UI -------
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-12">
      <h1 className="text-2xl font-bold mb-6">📦 Cadastro de Produto</h1>

      {/* Pesquisa */}
      <div className="mb-4 flex gap-2 items-center">
        <input
          className="border p-2 rounded"
          placeholder="Pesquisar por ID, Código ou Descrição"
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
        />
        <button onClick={handlePesquisar} className="bg-gray-600 text-white px-3 py-1 rounded">Pesquisar</button>
        <button onClick={handleNovo} className="bg-green-600 text-white px-3 py-1 rounded">Novo</button>
        <button onClick={handleLimpar} className="bg-gray-400 text-white px-3 py-1 rounded">Limpar</button>
      </div>

      <form onSubmit={handleSalvar} className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-md">
        {form.id && (
          <div className="mb-4">
            <label className="text-sm text-gray-600">ID</label>
            <input name="id" value={form.id} readOnly className="w-full bg-gray-100 border p-2 rounded" />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Código de Barras</label>
          <input name="codigo_barra" value={form.codigo_barra || ""} onChange={handleChange} className="border rounded w-full p-2" required />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Descrição</label>
          <input name="descricao" value={form.descricao || ""} onChange={handleChange} className="border rounded w-full p-2" required />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Custo</label>
          <input name="custo" type="number" step="0.01" value={form.custo || ""} onChange={handleChange} className="border rounded w-full p-2" />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Preço</label>
          <input name="preco" type="number" step="0.01" value={form.preco || ""} onChange={handleChange} className="border rounded w-full p-2" />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Categoria</label>
          <input name="categoria" value={form.categoria || ""} onChange={handleChange} className="border rounded w-full p-2" />
        </div>

        {/* Foto */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Foto do produto</label>
          {form.foto_url ? (
            <div className="mb-2">
              <img src={form.foto_url} alt="foto" className="h-28 w-28 object-cover rounded border" />
            </div>
          ) : null}
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUploadFoto(e.target.files[0])} />
          {form.foto_url && <p className="text-xs text-gray-500 mt-1">URL: {form.foto_url}</p>}
        </div>

        {/* Ativo na loja */}
        <div className="mb-4 flex items-center gap-2">
          <input id="ativo_loja" type="checkbox" name="ativo_loja" checked={!!form.ativo_loja} onChange={handleChange} />
          <label htmlFor="ativo_loja" className="text-sm font-medium">Ativo na loja</label>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">Empresa ID</label>
          <input name="empresa_id" value={form.empresa_id || ""} readOnly className="border rounded w-full p-2 bg-gray-100 cursor-not-allowed" />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{form.id ? "Atualizar" : "Salvar"}</button>
          <button type="button" onClick={handleExcluir} className="bg-red-600 text-white px-4 py-2 rounded">Excluir</button>
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
