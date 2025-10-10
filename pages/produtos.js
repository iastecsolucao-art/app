import { useState, useEffect, useRef } from "react";

export default function CadastroProduto() {
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    id: "",
    codigo_barra: "",
    descricao: "",
    custo: "",
    preco: "",
    categoria: "",
    empresa_id: "",     // se já tiver isso de sessão, injete no load
    foto_url: "",
    ativo_loja: true,
  });

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);     // salva/exclui
  const [uploading, setUploading] = useState(false); // upload
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

  const carregarDoObjeto = (p) =>
    setForm({
      id: p?.id ?? "",
      codigo_barra: p?.codigo_barra ?? "",
      descricao: p?.descricao ?? "",
      custo: p?.custo ?? "",
      preco: p?.preco ?? "",
      categoria: p?.categoria ?? "",
      empresa_id: p?.empresa_id ?? "",
      foto_url: p?.foto_url ?? "",
      ativo_loja: p?.ativo_loja ?? true,
    });

  const limparForm = (preservaEmpresa = false) =>
    setForm((f) => ({
      id: "",
      codigo_barra: "",
      descricao: "",
      custo: "",
      preco: "",
      categoria: "",
      empresa_id: preservaEmpresa ? f.empresa_id : "",
      foto_url: "",
      ativo_loja: true,
    }));

  const carregarPrimeiro = (lista) => {
    if (!Array.isArray(lista) || lista.length === 0) {
      limparForm();
      setIndexAtual(0);
      return;
    }
    carregarDoObjeto(lista[0]);
    setIndexAtual(0);
  };

  const safeJson = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  // ------- load inicial -------
  useEffect(() => {
    (async function fetchProdutos() {
      try {
        const res = await fetch(`/api/produtos`, { credentials: "include" });
        const txt = await res.text();
        const data = safeJson(txt) ?? [];
        if (!res.ok) throw new Error(data?.error || txt || "Erro ao carregar produtos");
        setProdutos(Array.isArray(data) ? data : []);
        carregarPrimeiro(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
        setStatus("❌ Erro ao carregar produtos");
      }
    })();
  }, []);

  const fetchProdutosAtualizados = async () => {
    try {
      const res = await fetch(`/api/produtos`, { credentials: "include" });
      const txt = await res.text();
      const data = safeJson(txt) ?? [];
      if (!res.ok) throw new Error(data?.error || txt || "Erro ao atualizar produtos");
      setProdutos(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
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
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      // Em erros, a Vercel às vezes retorna HTML -> precisamos tratar como texto antes
      const text = await r.text();
      const data = safeJson(text);

      if (!r.ok || !data?.url) {
        const msg = (data && (data.detail || data.error)) || text || "Falha no upload";
        throw new Error(msg);
      }

      setForm((f) => ({ ...f, foto_url: data.url }));
      setStatus("📸 Foto enviada!");
      // limpa o input para permitir reenviar mesma imagem depois (mobile)
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      console.error(e);
      setStatus("❌ Erro no upload: " + (e?.message || "desconhecido"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoverFoto = () => {
    setForm((f) => ({ ...f, foto_url: "" }));
    if (fileRef.current) fileRef.current.value = "";
  };

  // ------- CRUD -------
  const handleSalvar = async (e) => {
    e.preventDefault();
    if (uploading) return; // evita salvar enquanto está enviando foto
    setLoading(true);
    setStatus("Salvando...");

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
      const txt = await res.text();
      const data = safeJson(txt);

      if (!res.ok) {
        const msg = (data && (data.detail || data.error)) || txt || "Erro ao salvar produto";
        throw new Error(msg);
      }

      setStatus("✅ Produto salvo com sucesso!");
      const lista = await fetchProdutosAtualizados();
      carregarPrimeiro(lista);
    } catch (err) {
      console.error(err);
      setStatus("❌ Erro ao salvar o produto");
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async () => {
    if (!form.id) return setStatus("⚠️ Nenhum produto selecionado para excluir");
    setLoading(true);
    setStatus("Excluindo...");

    try {
      const res = await fetch(`/api/produtos/${form.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const txt = await res.text();
      const data = safeJson(txt);
      if (!res.ok) {
        const msg = (data && (data.detail || data.error)) || txt || "Erro ao excluir";
        throw new Error(msg);
      }

      setStatus("🗑️ Produto excluído!");
      const nova = produtos.filter((p) => p.id !== form.id);
      setProdutos(nova);
      carregarPrimeiro(nova);
    } catch (err) {
      console.error(err);
      setStatus("❌ Erro ao excluir o produto");
    } finally {
      setLoading(false);
    }
  };

  const navegar = (d) => {
    if (produtos.length === 0) return;
    let novo = indexAtual + d;
    if (novo < 0) novo = produtos.length - 1;
    if (novo >= produtos.length) novo = 0;
    setIndexAtual(novo);
    carregarDoObjeto(produtos[novo]);
  };

  const handlePesquisar = async () => {
    if (!pesquisa) return setStatus("⚠️ Informe um valor para pesquisar");
    setStatus("Pesquisando...");

    try {
      const res = await fetch(`/api/produtos?q=${encodeURIComponent(pesquisa)}`, {
        credentials: "include",
      });
      const txt = await res.text();
      const data = safeJson(txt) ?? [];
      if (!res.ok) throw new Error((data && data.error) || txt || "Erro na pesquisa");

      if (Array.isArray(data) && data.length > 0) {
        carregarDoObjeto(data[0]);
        setStatus(`🔎 Produto encontrado: ${data[0].descricao}`);
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
    limparForm(true);
    setStatus("🆕 Novo produto (preencha e clique Salvar)");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleLimpar = () => {
    limparForm(true);
    setStatus("");
    setPesquisa("");
    if (fileRef.current) fileRef.current.value = "";
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
        <button onClick={handlePesquisar} className="bg-gray-600 text-white px-3 py-1 rounded" disabled={loading || uploading}>
          Pesquisar
        </button>
        <button onClick={handleNovo} className="bg-green-600 text-white px-3 py-1 rounded" disabled={loading || uploading}>
          Novo
        </button>
        <button onClick={handleLimpar} className="bg-gray-400 text-white px-3 py-1 rounded" disabled={loading || uploading}>
          Limpar
        </button>
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
          <input
            name="codigo_barra"
            value={form.codigo_barra || ""}
            onChange={handleChange}
            className="border rounded w-full p-2"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Descrição</label>
          <input
            name="descricao"
            value={form.descricao || ""}
            onChange={handleChange}
            className="border rounded w-full p-2"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Custo</label>
          <input
            name="custo"
            type="number"
            step="0.01"
            value={form.custo || ""}
            onChange={handleChange}
            className="border rounded w-full p-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Preço</label>
          <input
            name="preco"
            type="number"
            step="0.01"
            value={form.preco || ""}
            onChange={handleChange}
            className="border rounded w-full p-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Categoria</label>
          <input
            name="categoria"
            value={form.categoria || ""}
            onChange={handleChange}
            className="border rounded w-full p-2"
          />
        </div>

        {/* Foto */}
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2">Foto do produto</label>

          {form.foto_url ? (
            <div className="mb-2 flex items-center gap-3">
              <img src={form.foto_url} alt="foto" className="h-28 w-28 object-cover rounded border" />
              <button
                type="button"
                onClick={handleRemoverFoto}
                className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded"
                disabled={uploading || loading}
              >
                Remover foto
              </button>
            </div>
          ) : null}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleUploadFoto(e.target.files[0])}
            disabled={uploading || loading}
          />
          {uploading && <p className="text-xs text-gray-500 mt-1">Enviando imagem...</p>}
          {form.foto_url && <p className="text-xs text-gray-500 mt-1 truncate">URL: {form.foto_url}</p>}
        </div>

        {/* Ativo na loja */}
        <div className="mb-4 flex items-center gap-2">
          <input
            id="ativo_loja"
            type="checkbox"
            name="ativo_loja"
            checked={!!form.ativo_loja}
            onChange={handleChange}
            disabled={loading}
          />
          <label htmlFor="ativo_loja" className="text-sm font-medium">Ativo na loja</label>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold mb-2">Empresa ID</label>
          <input
            name="empresa_id"
            value={form.empresa_id || ""}
            readOnly
            className="border rounded w-full p-2 bg-gray-100 cursor-not-allowed"
          />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading || uploading}>
            {loading ? "Salvando..." : form.id ? "Atualizar" : "Salvar"}
          </button>
          <button
            type="button"
            onClick={handleExcluir}
            className="bg-red-600 text-white px-4 py-2 rounded"
            disabled={loading || uploading || !form.id}
          >
            Excluir
          </button>
        </div>

        <div className="flex justify-between mt-4">
          <button type="button" onClick={() => navegar(-1)} className="px-3 py-1 bg-gray-300 rounded" disabled={loading || uploading}>
            ⏮️ Anterior
          </button>
          <button type="button" onClick={() => navegar(1)} className="px-3 py-1 bg-gray-300 rounded" disabled={loading || uploading}>
            Próximo ⏭️
          </button>
        </div>

        {status && <p className="mt-4 text-center">{status}</p>}
      </form>
    </div>
  );
}
