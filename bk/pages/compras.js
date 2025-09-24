import { useState, useEffect } from "react";

export default function Compras() {
  const [abaAtiva, setAbaAtiva] = useState("pesquisar");
  const [compraId, setCompraId] = useState(null);
  const [fornecedor, setFornecedor] = useState("");
  const [numeroNF, setNumeroNF] = useState("");
  const [usuario, setUsuario] = useState("sistema");
  const [status, setStatus] = useState("pendente");
  const [dataCompra, setDataCompra] = useState(new Date().toISOString().split("T")[0]);

  const [itens, setItens] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const [listaCompras, setListaCompras] = useState([]);
  const [filtroFornecedor, setFiltroFornecedor] = useState("");

  useEffect(() => {
    carregarCompras();
  }, []);

  const carregarCompras = async () => {
    const res = await fetch("/api/compras");
    const data = await res.json();
    if (res.ok) setListaCompras(data);
  };

  const carregarCompra = async (id) => {
    const res = await fetch(`/api/compras/${id}`);
    const data = await res.json();
    if (res.ok) {
      setAbaAtiva("editar");
      setCompraId(data.id);
      setFornecedor(data.fornecedor);
      setNumeroNF(data.numero_nf || "");
      setUsuario(data.usuario || "sistema");
      setStatus(data.status || "pendente");
      setDataCompra(data.data_compra ? data.data_compra.split("T")[0] : "");
      setItens(
        data.itens.map((x, idx) => ({
          item_compra: idx + 1,
          codigo: x.codigo,
          descricao: x.descricao,
          quantidade: x.quantidade,
          preco: parseFloat(x.preco),
          total_item: parseFloat(x.total),
        }))
      );
    }
  };

  // Items Handlers
  const addItem = () => {
    setItens([
      ...itens,
      { item_compra: itens.length + 1, codigo: "", descricao: "", quantidade: 1, preco: 0, total_item: 0 },
    ]);
  };

  const updateItem = (index, field, value) => {
    const copia = [...itens];
    copia[index][field] = value;
    if (field === "quantidade" || field === "preco") {
      const qtd = parseFloat(copia[index].quantidade) || 0;
      const preco = parseFloat(copia[index].preco) || 0;
      copia[index].total_item = qtd * preco;
    }
    setItens(copia);
  };

  const handleSelectProduto = (produto) => {
    const lista = [...itens];
    lista[selectedIndex].codigo = produto.codigo_barra;
    lista[selectedIndex].descricao = produto.descricao;
    lista[selectedIndex].preco = parseFloat(produto.custo); // 👈 custo usado no lugar de preco
    lista[selectedIndex].total_item =
      lista[selectedIndex].quantidade * parseFloat(produto.custo);
    setItens(lista);
  };

  const quantidadeTotal = itens.reduce((acc, x) => acc + (parseInt(x.quantidade) || 0), 0);
  const valorTotal = itens.reduce((acc, x) => acc + (parseFloat(x.total_item) || 0), 0);

  // Validar antes de salvar
  const validar = () => {
    if (!fornecedor) { alert("Fornecedor é obrigatório!"); return false; }
    if (!numeroNF) { alert("Número da NF é obrigatório!"); return false; }
    if (!dataCompra) { alert("Data de emissão é obrigatória!"); return false; }
    if (itens.length === 0) { alert("Adicione ao menos 1 item!"); return false; }
    return true;
  };

  // CRUD
  const salvarCompra = async () => {
    if (!validar()) return;
    const res = await fetch("/api/compras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fornecedor, numero_nf: numeroNF, usuario, status, data_compra: dataCompra, itens }),
    });
    const data = await res.json();
    if (res.ok) {
      alert("✅ Compra salva!");
      setCompraId(data.id);
      carregarCompras();
    } else alert("❌ " + data.error);
  };

  const alterarCompra = async () => {
    if (!compraId) return alert("Carregue uma compra antes de alterar.");
    if (!validar()) return;
    const res = await fetch(`/api/compras/${compraId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fornecedor, numero_nf: numeroNF, usuario, status, data_compra: dataCompra, itens }),
    });
    const data = await res.json();
    if (res.ok) alert("✏️ Compra alterada!");
    else alert("❌ " + data.error);
  };

  const excluirCompra = async () => {
    if (!compraId) return;
    if (!confirm("Deseja excluir esta compra?")) return;
    await fetch(`/api/compras/${compraId}`, { method: "DELETE" });
    alert("🗑️ Compra excluída");
    limparTela();
    carregarCompras();
  };

  const limparTela = () => {
    setCompraId(null);
    setFornecedor("");
    setNumeroNF("");
    setUsuario("sistema");
    setStatus("pendente");
    setDataCompra(new Date().toISOString().split("T")[0]);
    setItens([]);
  };

  const novaCompra = () => { limparTela(); addItem(); setAbaAtiva("editar"); };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Cadastro de Compras</h1>

      {/* Abas */}
      <div className="flex gap-4 mb-4">
        <button onClick={() => setAbaAtiva("pesquisar")}
          className={`px-4 py-2 rounded ${abaAtiva === "pesquisar" ? "bg-blue-600 text-white" : "bg-gray-300"}`}>
          🔎 Pesquisar
        </button>
        <button onClick={novaCompra} className="bg-blue-500 text-white px-4 py-2 rounded">➕ Nova</button>
      </div>

      {/* Aba Pesquisar */}
      {abaAtiva === "pesquisar" && (
        <>
          <input placeholder="Filtrar fornecedor"
            value={filtroFornecedor} onChange={e => setFiltroFornecedor(e.target.value)}
            className="border p-2 mb-3" />
          <table className="w-full border">
            <thead className="bg-gray-200">
              <tr><th>ID</th><th>Fornecedor</th><th>Data</th><th>Nº NF</th><th>Status</th><th>Ação</th></tr>
            </thead>
            <tbody>
              {listaCompras.filter(c => c.fornecedor?.toLowerCase().includes(filtroFornecedor.toLowerCase()))
                .map(c => (
                  <tr key={c.id} className="text-center border">
                    <td>{c.id}</td>
                    <td>{c.fornecedor}</td>
                    <td>{c.data_compra ? new Date(c.data_compra).toLocaleDateString() : "-"}</td>
                    <td>{c.numero_nf}</td>
                    <td>{c.status}</td>
                    <td><button onClick={() => carregarCompra(c.id)} className="bg-green-500 text-white px-2">Abrir</button></td>
                  </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Aba Editar */}
      {abaAtiva === "editar" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div><label>Fornecedor</label>
              <input value={fornecedor} onChange={e => setFornecedor(e.target.value)} className="border p-2 w-full" /></div>
            <div><label>Nº NF entrada</label>
              <input value={numeroNF} onChange={e => setNumeroNF(e.target.value)} className="border p-2 w-full" /></div>
            <div><label>Usuário</label>
              <input value={usuario} onChange={e => setUsuario(e.target.value)} className="border p-2 w-full" /></div>
            <div><label>Emissão</label>
              <input type="date" value={dataCompra} onChange={e => setDataCompra(e.target.value)} className="border p-2 w-full" /></div>
          </div>

          {/* Itens */}
          <table className="w-full border mb-4">
            <thead className="bg-gray-200">
              <tr><th>Item</th><th>Código</th><th>Descrição</th><th>Qtd</th><th>Custo</th><th>Total</th></tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => (
                <tr key={idx} className="text-center border">
                  <td>{item.item_compra}</td>
                  <td className="flex items-center gap-1 justify-center">
                    <input value={item.codigo} onChange={e => updateItem(idx, "codigo", e.target.value)} className="border p-1 w-20" />
                    <button onClick={() => { setSelectedIndex(idx); setShowModal(true); }} className="bg-blue-500 text-white px-2">🔍</button>
                  </td>
                  <td><input value={item.descricao} readOnly className="border p-1 w-full bg-gray-100" /></td>
                  <td><input type="number" value={item.quantidade} onChange={e => updateItem(idx, "quantidade", e.target.value)} className="border p-1 w-16" /></td>
                  <td><input type="number" value={item.preco} onChange={e => updateItem(idx, "preco", e.target.value)} className="border p-1 w-20" /></td>
                  <td>{Number(item.total_item || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mb-4">
            <p><strong>Quantidade Total:</strong> {quantidadeTotal}</p>
            <p><strong>Valor Total:</strong> R$ {Number(valorTotal || 0).toFixed(2)}</p>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={addItem} className="bg-gray-400 text-white px-4 py-2 rounded">➕ Item</button>
            <button onClick={salvarCompra} className="bg-green-600 text-white px-4 py-2 rounded">Salvar</button>
            <button onClick={alterarCompra} className="bg-yellow-500 text-white px-4 py-2 rounded">Alterar</button>
            <button onClick={excluirCompra} className="bg-red-600 text-white px-4 py-2 rounded">Excluir</button>
            <button onClick={limparTela} className="bg-gray-600 text-white px-4 py-2 rounded">Limpar</button>
          </div>
        </>
      )}

      {/* Modal Produtos */}
      {showModal && (
        <ModalProdutos onSelect={handleSelectProduto} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function ModalProdutos({ onClose, onSelect }) {
  const [produtos, setProdutos] = useState([]);
  useEffect(() => {
    const fetchProdutos = async () => {
      const res = await fetch("/api/produtos");
      const data = await res.json();
      setProdutos(data);
    };
    fetchProdutos();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-4 rounded shadow-lg max-w-3xl w-full">
        <h2 className="text-lg font-bold mb-4">Selecionar Produto</h2>
        <table className="w-full border">
          <thead className="bg-gray-200"><tr><th>Código</th><th>Descrição</th><th>Custo</th><th>Ação</th></tr></thead>
          <tbody>
            {produtos.map((p, idx) => (
              <tr key={idx} className="text-center border">
                <td>{p.codigo_barra}</td>
                <td>{p.descricao}</td>
                <td>R$ {Number(p.custo).toFixed(2)}</td>
                <td><button onClick={() => { onSelect(p); onClose(); }} className="bg-blue-500 text-white px-3 py-1 rounded">Selecionar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={onClose} className="mt-4 bg-red-500 text-white px-4 py-2 rounded">Fechar</button>
      </div>
    </div>
  );
}