import { useEffect, useState } from "react";

export default function Entradas() {
  const [entradas, setEntradas] = useState([]);

  useEffect(() => {
    const carregar = async () => {
      const res = await fetch("/api/entradas");
      const data = await res.json();
      if (res.ok) setEntradas(data);
    };
    carregar();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📦 Entradas de Estoque</h1>

      <table className="w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th>ID</th>
            <th>Produto</th>
            <th>Qtd</th>
            <th>Custo</th>
            <th>Data</th>
            <th>Referência</th>
          </tr>
        </thead>
        <tbody>
          {entradas.map((e) => (
            <tr key={e.id} className="text-center border">
              <td>{e.id}</td>
              <td>{e.produto}</td>
              <td>{e.quantidade}</td>
              <td>R$ {Number(e.custo).toFixed(2)}</td>
              <td>{new Date(e.data_movimento).toLocaleDateString()}</td>
              <td>{e.referencia}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}