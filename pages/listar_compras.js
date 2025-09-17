import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ListaCompras() {
  const [compras, setCompras] = useState([]);
  const [status, setStatus] = useState(null);
  const router = useRouter();

  const carregarCompras = async () => {
    try {
      const res = await fetch("/api/compras");
      const data = await res.json();
      if (res.ok) setCompras(data);
    } catch (err) {
      console.error("Erro ao carregar compras:", err);
    }
  };

  useEffect(() => {
    carregarCompras();
  }, []);

  const gerarEntrada = async (id) => {
    if (!confirm("Deseja gerar a entrada para esta compra?")) return;
    setStatus("⏳ Gerando entrada...");
    try {
      const res = await fetch(`/api/gerar_entrada?id=${id}`, { method: "POST" });
      if (res.ok) {
        setStatus("✅ Entrada gerada com sucesso!");
        carregarCompras();
      } else {
        setStatus("❌ Falha ao gerar entrada!");
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Erro ao gerar entrada!");
    }
  };

  const excluirCompra = async (id) => {
    if (!confirm("Tem certeza que deseja excluir esta compra?")) return;
    try {
      const res = await fetch(`/api/compras/${id}`, { method: "DELETE" }); // ✅ corrigido para usar /compras/[id]
      if (res.ok) {
        setStatus("🗑️ Compra excluída.");
        carregarCompras();
      } else {
        setStatus("❌ Erro ao excluir!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">📑 Lista de Compras</h1>

      <div className="bg-white shadow rounded p-4 overflow-x-auto">
        <table className="w-full border">
          <thead className="bg-gray-200">
            <tr>
              <th>ID</th>
              <th>Fornecedor</th>
              <th>NF</th>
              <th>Data</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c) => (
              <tr key={c.id} className="text-center border">
                <td>{c.id}</td>
                <td>{c.fornecedor}</td>
                <td>{c.numero_nf}</td>
                <td>{new Date(c.data_compra).toLocaleDateString()}</td>
                <td>{c.status}</td>
                <td className="flex justify-center gap-2">
                  {/* Botão Ver */}
                  <button
                    onClick={() => router.push(`/compras/${c.id}?view=1`)}
                    className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Ver
                  </button>

                  {/* Botão Editar */}
                  <button
                    onClick={() => router.push(`/compras/${c.id}?edit=1`)}
                    className="bg-green-500 text-white px-2 py-1 rounded text-sm"
                  >
                    Editar
                  </button>

                  {/* Botão Entrada */}
                  <button
                    onClick={() => gerarEntrada(c.id)}
                    className="bg-purple-600 text-white px-2 py-1 rounded text-sm"
                    disabled={c.status === "concluida"}
                  >
                    📦 Entrada
                  </button>

                  {/* Botão Excluir */}
                  <button
                    onClick={() => excluirCompra(c.id)}
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                  >
                    🗑 Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {status && <p className="mt-4 text-sm">{status}</p>}
      </div>
    </div>
  );
}