import { useEffect, useState } from "react";

export default function Estoque() {
  const [estoque, setEstoque] = useState([]);

  useEffect(() => {
    const carregar = async () => {
      const res = await fetch("/api/estoque");
      const data = await res.json();
      if (res.ok) setEstoque(data);
    };
    carregar();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📊 Saldo de Estoque</h1>
      <table className="w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th>Produto</th>
            <th>Quantidade</th>
            <th>Custo Médio</th>
          </tr>
        </thead>
        <tbody>
          {estoque.map((e, idx) => (
            <tr key={idx} className="text-center border">
              <td>{e.descricao}</td>
              <td>{e.saldo}</td>
              <td>R$ {Number(e.custo_medio).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}