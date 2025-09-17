import { useState, useEffect } from "react";

export default function Orcamento() {
  const [abaAtiva, setAbaAtiva] = useState("editar");
  const [numeroVenda, setNumeroVenda] = useState(null);
  const [itens, setItens] = useState([]);
  const [condicaoPgto, setCondicaoPgto] = useState("");
  const [validade, setValidade] = useState("");
  const [dataOrcamento, setDataOrcamento] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showModal, setShowModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const [numeroOrcamento, setNumeroOrcamento] = useState(null);
  const [orcamentoId, setOrcamentoId] = useState(null);

  const [listaOrcamentos, setListaOrcamentos] = useState([]);
  const [posicaoLista, setPosicaoLista] = useState(-1);
  const [listaPesquisa, setListaPesquisa] = useState([]);

  // filtros pesquisa
  const [filtroNumero, setFiltroNumero] = useState("");
  const [filtroCondicao, setFiltroCondicao] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  useEffect(() => {
    const carregarLista = async () => {
      const res = await fetch("/api/orcamentos");
      const data = await res.json();
      if (res.ok) setListaOrcamentos(data);
    };
    carregarLista();
  }, []);

  const addItem = () => {
    setItens([
      ...itens,
      {
        item_orcamento: itens.length + 1,
        codigo: "",
        descricao: "",
        observacao: "",
        quantidade: 1,
        preco: 0,
        valor_total_item: 0,
      },
    ]);
  };

  const updateItem = (index, field, value) => {
    const lista = [...itens];
    lista[index][field] = value;
    if (field === "quantidade" || field === "preco") {
      const qtd = parseFloat(lista[index].quantidade) || 0;
      const preco = parseFloat(lista[index].preco) || 0;
      lista[index].valor_total_item = qtd * preco;
    }
    setItens(lista);
  };

  const handleSelectProduto = (produto) => {
    const lista = [...itens];
    lista[selectedIndex].codigo = produto.codigo_barra;
    lista[selectedIndex].descricao = produto.descricao;
    lista[selectedIndex].preco = parseFloat(produto.preco);
    lista[selectedIndex].valor_total_item =
      (parseFloat(lista[selectedIndex].quantidade) || 0) *
      parseFloat(produto.preco);
    setItens(lista);
  };

  const valorTotalOrcamento = itens.reduce(
    (acc, x) => acc + (x.valor_total_item || 0),
    0
  );
  const quantidadeTotal = itens.reduce(
    (acc, x) => acc + (parseInt(x.quantidade) || 0),
    0
  );

  const carregarOrcamento = async (numero) => {
    const res = await fetch(`/api/orcamentos?numero=${numero}`);
    const data = await res.json();
    if (res.ok) {
      setAbaAtiva("editar");
      setOrcamentoId(data.id);
      setNumeroOrcamento(data.numero_orcamento);
      setCondicaoPgto(data.condicao_pgto);
      setValidade(data.validade ? data.validade.split("T")[0] : "");
      setDataOrcamento(
        data.data_orcamento ? data.data_orcamento.split("T")[0] : ""
      );
      setItens(
        data.itens.map((item, idx) => ({
          item_orcamento: idx + 1,
          codigo: item.codigo,
          descricao: item.descricao,
          observacao: item.observacao || "",
          quantidade: item.quantidade,
          preco: item.preco,
          valor_total_item: item.valor_total_item,
        }))
      );
      setNumeroVenda(data.numero_venda || null); // se já existir linkado
    } else {
      alert("Erro ao carregar: " + data.error);
    }
  };

  const pesquisarOrcamentos = async () => {
    const res = await fetch("/api/orcamentos");
    const data = await res.json();
    if (res.ok) {
      let filtrados = data.filter((o) => o.status !== "convertido"); // ⚡ esconde convertidos

      if (filtroNumero)
        filtrados = filtrados.filter((o) =>
          o.numero_orcamento.includes(filtroNumero)
        );

      if (filtroCondicao)
        filtrados = filtrados.filter((o) =>
          o.condicao_pgto?.toLowerCase().includes(filtroCondicao.toLowerCase())
        );

      if (filtroDataInicio)
        filtrados = filtrados.filter(
          (o) => new Date(o.data_orcamento) >= new Date(filtroDataInicio)
        );

      if (filtroDataFim)
        filtrados = filtrados.filter(
          (o) => new Date(o.data_orcamento) <= new Date(filtroDataFim)
        );

      setListaPesquisa(filtrados);
    }
  };

  // ------------------- CRUD -------------------

  const salvarOrcamento = async () => {
    const res = await fetch("/api/orcamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        condicao_pgto: condicaoPgto,
        valor_total: valorTotalOrcamento,
        quantidade_total: quantidadeTotal,
        data_orcamento: dataOrcamento || null,
        validade,
        itens,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      setNumeroOrcamento(data.numero_orcamento);
    } else alert("Erro: " + data.error);
  };

  const alterarOrcamento = async () => {
    if (!orcamentoId) {
      alert("Pesquise primeiro um orçamento.");
      return;
    }
    const res = await fetch("/api/orcamentos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: orcamentoId,
        condicao_pgto: condicaoPgto,
        valor_total: valorTotalOrcamento,
        quantidade_total: quantidadeTotal,
        data_orcamento: dataOrcamento || null,
        validade,
        itens,
      }),
    });
    const data = await res.json();
    if (res.ok) alert(data.message);
    else alert("Erro: " + data.error);
  };

  const excluirOrcamento = async () => {
    if (!orcamentoId) {
      alert("Pesquise primeiro um orçamento.");
      return;
    }
    await fetch(`/api/orcamentos?id=${orcamentoId}`, { method: "DELETE" });
    alert("Orçamento excluído com sucesso!");
    limparTela();
  };

  const limparTela = () => {
    setNumeroOrcamento(null);
    setOrcamentoId(null);
    setNumeroVenda(null);
    setItens([]);
    setCondicaoPgto("");
    setValidade("");
    setDataOrcamento(new Date().toISOString().split("T")[0]);
    setListaPesquisa([]);
    setPosicaoLista(-1);
    setFiltroNumero("");
    setFiltroCondicao("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
  };

  const transformarEmVenda = async () => {
    if (!orcamentoId) {
      alert("Carregue um orçamento antes de transformar em venda.");
      return;
    }
    if (itens.length === 0) {
      alert("Adicione itens ao orçamento antes de transformar em venda.");
      return;
    }

    const res = await fetch("/api/vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orcamento_id: orcamentoId,
        condicao_pgto: condicaoPgto,
        quantidade_total: quantidadeTotal,
        valor_total: valorTotalOrcamento,
        itens,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setNumeroVenda(data.numero_venda); 
      alert(`Venda gerada com sucesso! Número: ${data.numero_venda}`);

      // ⚡ Atualiza orçamento como convertido
      await fetch("/api/orcamentos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orcamentoId,
          status: "convertido",
        }),
      });
    } else {
      alert("Erro: " + data.error);
    }
  };

  const novoOrcamento = () => {
    setNumeroOrcamento(null);
    setOrcamentoId(null);
    setNumeroVenda(null);
    setCondicaoPgto("");
    setValidade("");
    setDataOrcamento(new Date().toISOString().split("T")[0]);
    setItens([
      {
        item_orcamento: 1,
        codigo: "",
        descricao: "",
        observacao: "",
        quantidade: 1,
        preco: 0,
        valor_total_item: 0,
      },
    ]);
    setAbaAtiva("editar");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Cadastro de Orçamento</h1>

      {/* Abas */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setAbaAtiva("pesquisar")}
          className={`px-4 py-2 rounded ${
            abaAtiva === "pesquisar"
              ? "bg-blue-600 text-white"
              : "bg-gray-300 text-black"
          }`}
        >
          🔎 Pesquisar
        </button>
        <button
          onClick={transformarEmVenda}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Transformar em Venda
        </button>
        <button
          onClick={() => setAbaAtiva("editar")}
          className={`px-4 py-2 rounded ${
            abaAtiva === "editar"
              ? "bg-blue-600 text-white"
              : "bg-gray-300 text-black"
          }`}
        >
          ✏️ Editar
        </button>
      </div>

      {/* Aba Pesquisar */}
      {abaAtiva === "pesquisar" && (
        <>
          <div className="mb-4 flex gap-2 flex-wrap">
            <input
              placeholder="Filtrar Nº Orçamento"
              value={filtroNumero}
              onChange={(e) => setFiltroNumero(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              placeholder="Filtrar Condição Pgto"
              value={filtroCondicao}
              onChange={(e) => setFiltroCondicao(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="border p-2 rounded"
            />
            <button
              onClick={pesquisarOrcamentos}
              className="bg-blue-600 text-white px-4 rounded"
            >
              Pesquisar
            </button>
            <button
              onClick={limparTela}
              className="bg-gray-600 text-white px-4 rounded"
            >
              Limpar
            </button>
          </div>

          {listaPesquisa.length > 0 && (
            <table className="w-full border mt-4">
              <thead className="bg-gray-200">
                <tr>
                  <th>Número</th>
                  <th>Data</th>
                  <th>Validade</th>
                  <th>Condição</th>
                  <th>Qtd</th>
                  <th>Valor</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {listaPesquisa.map((orc, idx) => (
                  <tr key={idx} className="text-center border">
                    <td>{orc.numero_orcamento}</td>
                    <td>
                      {orc.data_orcamento
                        ? new Date(orc.data_orcamento).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>
                      {orc.validade
                        ? new Date(orc.validade).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>{orc.condicao_pgto}</td>
                    <td>{orc.quantidade_total}</td>
                    <td>
                      R${" "}
                      {orc.valor_total
                        ? parseFloat(orc.valor_total).toFixed(2)
                        : "0.00"}
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          carregarOrcamento(orc.numero_orcamento)
                        }
                        className="bg-green-500 text-white px-2 py-1 rounded"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Aba Editar */}
      {abaAtiva === "editar" && (
        <>
          {numeroOrcamento && (
            <p className="mb-4 text-blue-700 font-semibold">
              Número do Orçamento: {numeroOrcamento}
            </p>
          )}
          {numeroVenda && (
            <p className="mb-2 text-green-700 font-semibold">
              Venda Gerada:{" "}
              <a
                href="/vendas"
                className="underline text-blue-700 ml-2"
              >
                {numeroVenda}
              </a>
            </p>
          )}

          {/* Campos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label>Data do Orçamento</label>
              <input
                type="date"
                value={dataOrcamento}
                onChange={(e) => setDataOrcamento(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label>Validade</label>
              <input
                type="date"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label>Condição de Pagamento</label>
              <input
                type="text"
                value={condicaoPgto}
                onChange={(e) => setCondicaoPgto(e.target.value)}
                className="border p-2 rounded w-full"
              />
            </div>
          </div>

          {/* Itens */}
          <table className="w-full border mb-4 mt-6">
            <thead className="bg-gray-200">
              <tr>
                <th>Item</th>
                <th>Código</th>
                <th>Descrição</th>
                <th>Observação</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th>Total Item</th>
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500">
                    Nenhum item adicionado
                  </td>
                </tr>
              ) : (
                itens.map((item, idx) => (
                  <tr key={idx} className="text-center border">
                    <td>{item.item_orcamento}</td>
                    <td className="flex items-center gap-2 justify-center">
                      <input
                        value={item.codigo}
                        onChange={(e) =>
                          updateItem(idx, "codigo", e.target.value)
                        }
                        className="border p-1 w-24"
                      />
                      <button
                        className="bg-blue-500 text-white px-2 py-1 rounded"
                        onClick={() => {
                          setSelectedIndex(idx);
                          setShowModal(true);
                        }}
                      >
                        🔍
                      </button>
                    </td>
                    <td>
                      <input
                        value={item.descricao}
                        readOnly
                        className="border p-1 w-full bg-gray-100"
                      />
                    </td>
                    <td>
                      <input
                        value={item.observacao}
                        onChange={(e) =>
                          updateItem(idx, "observacao", e.target.value)
                        }
                        className="border p-1 w-full"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantidade}
                        onChange={(e) =>
                          updateItem(idx, "quantidade", e.target.value)
                        }
                        className="border p-1 w-20"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.preco}
                        onChange={(e) =>
                          updateItem(idx, "preco", e.target.value)
                        }
                        className="border p-1 w-24"
                      />
                    </td>
                    <td>{parseFloat(item.valor_total_item).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totais */}
          <div className="mb-4">
            <p>
              <strong>Quantidade Total:</strong> {quantidadeTotal}
            </p>
            <p>
              <strong>Valor Total Orçamento:</strong> R${" "}
              {valorTotalOrcamento.toFixed(2)}
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-4 mt-4 flex-wrap">
            <button
              onClick={addItem}
              className="bg-gray-400 text-white px-4 py-2 rounded"
            >
              Adicionar Item
            </button>
            <button
              onClick={salvarOrcamento}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Salvar
            </button>
            <button
              onClick={alterarOrcamento}
              className="bg-yellow-500 text-white px-4 py-2 rounded"
            >
              Alterar
            </button>
            <button
              onClick={excluirOrcamento}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Excluir
            </button>
            <button
              onClick={limparTela}
              className="bg-gray-600 text-white px-4 py-2 rounded"
            >
              Limpar
            </button>
            <button
              onClick={novoOrcamento}
              className="bg-blue-700 text-white px-4 py-2 rounded"
            >
              Novo
            </button>
          </div>
        </>
      )}

      {showModal && (
        <ModalProdutos
          onClose={() => setShowModal(false)}
          onSelect={handleSelectProduto}
        />
      )}
    </div>
  );
}

// Modal Produtos
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
          <thead className="bg-gray-200">
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Preço</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p, idx) => (
              <tr key={idx} className="text-center border">
                <td>{p.codigo_barra}</td>
                <td>{p.descricao}</td>
                <td>R$ {parseFloat(p.preco).toFixed(2)}</td>
                <td>
                  <button
                    onClick={() => {
                      onSelect(p);
                      onClose();
                    }}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    Selecionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}