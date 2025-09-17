import { useState, useEffect } from "react";

export default function Vendas() {
  const [vendas, setVendas] = useState([]);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);

  // 🔹 Busca últimas vendas
  useEffect(() => {
    const fetchVendas = async () => {
      const res = await fetch("/api/vendas");
      const data = await res.json();
      if (res.ok) setVendas(data);
    };
    fetchVendas();
  }, []);

  const carregarVenda = async (id) => {
    const res = await fetch(`/api/vendas?id=${id}`);
    const data = await res.json();
    if (res.ok) setVendaSelecionada(data);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Lista de Vendas</h1>

      {/* Lista de Vendas */}
      <table className="w-full border mb-6">
        <thead className="bg-gray-200">
          <tr>
            <th>Nº Venda</th>
            <th>Data</th>
            <th>Condição</th>
            <th>Qtd</th>
            <th>Valor Total</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {vendas.map((v) => (
            <tr key={v.id} className="text-center border">
              <td>{v.numero_venda}</td>
              <td>{new Date(v.data_venda).toLocaleDateString()}</td>
              <td>{v.condicao_pgto}</td>
              <td>{v.quantidade_total}</td>
              <td>R$ {parseFloat(v.valor_total).toFixed(2)}</td>
              <td>
                <button
                  onClick={() => carregarVenda(v.id)}
                  className="bg-blue-600 text-white px-2 py-1 rounded"
                >
                  Ver Detalhes
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Detalhes da Venda */}
      {vendaSelecionada && (
        <div className="mt-6 border p-4 rounded bg-gray-50">
          <h2 className="text-lg font-bold mb-2">
            Venda Nº {vendaSelecionada.numero_venda}
          </h2>
          <p>Data: {new Date(vendaSelecionada.data_venda).toLocaleDateString()}</p>
          <p>Condição de Pagamento: {vendaSelecionada.condicao_pgto}</p>
          <p>Quantidade: {vendaSelecionada.quantidade_total}</p>
          <p>Valor Total: R$ {parseFloat(vendaSelecionada.valor_total).toFixed(2)}</p>

          {/* Itens */}
          <h3 className="mt-4 font-semibold">Itens da Venda</h3>
          <table className="w-full border mt-2">
            <thead className="bg-gray-200">
              <tr>
                <th>Código</th>
                <th>Descrição</th>
                <th>Observação</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th>Total Item</th>
              </tr>
            </thead>
            <tbody>
              {vendaSelecionada.itens.map((i) => (
                <tr key={i.id} className="text-center border">
                  <td>{i.codigo}</td>
                  <td>{i.descricao}</td>
                  <td>{i.observacao}</td>
                  <td>{i.quantidade}</td>
                  <td>R$ {parseFloat(i.preco).toFixed(2)}</td>
                  <td>R$ {parseFloat(i.valor_total_item).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}