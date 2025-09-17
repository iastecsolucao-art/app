import { useEffect, useState } from "react";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  const [resumo, setResumo] = useState({ compras: 0, vendas: 0, estoque: 0 });
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    const fetchResumo = async () => {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (!data.error) setResumo(data);
    };

    const fetchCategorias = async () => {
      const res = await fetch("/api/dashboard/estoque_categorias");
      const data = await res.json();
      if (!data.error) setCategorias(data);
    };

    fetchResumo();
    fetchCategorias();
  }, []);

  const pieData = {
labels: categorias.map((c) => c.tipo),
  datasets: [
    {
      label: "Qtd",
      data: categorias.map((c) => c.total),
      backgroundColor: ["#3B82F6", "#22C55E", "#F97316", "#8B5CF6"],
      borderWidth: 1,
      },
    ],
  };

  return (
    <div className="p-6 pt-20 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
        📊 Dashboard
      </h1>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-blue-600 text-white p-6 rounded shadow-lg text-center">
          <h2 className="text-xl font-bold">Compras</h2>
          <p className="text-4xl">{resumo.compras}</p>
        </div>
        <div className="bg-green-600 text-white p-6 rounded shadow-lg text-center">
          <h2 className="text-xl font-bold">Vendas</h2>
          <p className="text-4xl">{resumo.vendas}</p>
        </div>
        <div className="bg-purple-600 text-white p-6 rounded shadow-lg text-center">
          <h2 className="text-xl font-bold">Estoque</h2>
          <p className="text-4xl">{resumo.estoque}</p>
        </div>
      </div>

      {/* Gráfico de Pizza */}
      <div className="bg-white p-6 rounded shadow-lg mb-10">
        <h2 className="text-xl font-bold mb-4">🥧 Estoque por Categoria</h2>
        {categorias.length > 0 ? (
          <Pie data={pieData} />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Carregando gráfico...
          </div>
        )}
      </div>
    </div>
  );
}