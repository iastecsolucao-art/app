import { useEffect, useState } from "react";
import { utils, writeFile } from "xlsx"; 
import { Bar, Pie } from "react-chartjs-2"; 
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement
} from "chart.js";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function Relatorios() {
  const [porLoja, setPorLoja] = useState([]);
  const [porLojaSetor, setPorLojaSetor] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    async function fetchDados() {
      try {
        const res = await fetch("https://n8n.iastec.servicos.ws/webhook/relatorios");
        const data = await res.json();

        // ⚡ Corrige caso o n8n devolva array em vez de objeto
        const obj = Array.isArray(data) ? data[0] : data;

        setPorLoja(obj.porLoja || []);
        setPorLojaSetor(obj.porLojaSetor || []);
      } catch (err) {
        console.error("Erro:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDados();
  }, []);
  const exportarExcel = () => {
    const ws1 = utils.json_to_sheet(porLoja);
    const ws2 = utils.json_to_sheet(porLojaSetor);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws1, "Por Loja");
    utils.book_append_sheet(wb, ws2, "Por Loja e Setor");
    writeFile(wb, "relatorios_inventario.xlsx");
  };

  const chartLoja = {
    labels: porLoja.map(d => d.loja),
    datasets: [
      { label: "Total de Itens", data: porLoja.map(d => d.total_itens), backgroundColor: ["#2563eb","#10b981","#f59e0b","#ef4444"] }
    ]
  };

  const chartLojaSetor = {
    labels: porLojaSetor.map(d => `${d.loja} - ${d.setor}`),
    datasets: [
      { label: "Total de Itens", data: porLojaSetor.map(d => d.total_itens), backgroundColor: "rgba(37, 99, 235, 0.7)" }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-16 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">📊 Relatórios de Inventário</h1>
      {loading ? <p>Carregando...</p> : (
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* --- 1. Total por Loja --- */}
          <section className="bg-white shadow rounded p-4">
            <h2 className="text-xl font-semibold mb-4">🏬 Total por Loja</h2>
            <table className="w-full text-sm mb-6">
              <thead className="bg-blue-600 text-white"><tr><th>Loja</th><th>Total Itens</th></tr></thead>
              <tbody>
                {porLoja.map((d,i)=>(<tr key={i} className="border-b">
                  <td className="px-2 py-1">{d.loja}</td>
                  <td className="px-2 py-1 font-bold">{d.total_itens}</td>
                </tr>))}
              </tbody>
            </table>
            <Pie data={chartLoja} />
          </section>

          {/* --- 2. Total por Loja e Setor --- */}
          <section className="bg-white shadow rounded p-4">
            <h2 className="text-xl font-semibold mb-4">🏷️ Total por Loja e Setor</h2>
            <table className="w-full text-sm mb-6">
              <thead className="bg-blue-600 text-white"><tr><th>Loja</th><th>Setor</th><th>Total Itens</th></tr></thead>
              <tbody>
                {porLojaSetor.map((d,i)=>(<tr key={i} className="border-b">
                  <td className="px-2 py-1">{d.loja}</td>
                  <td className="px-2 py-1">{d.setor}</td>
                  <td className="px-2 py-1 font-bold">{d.total_itens}</td>
                </tr>))}
              </tbody>
            </table>
            <Bar data={chartLojaSetor} />
          </section>

          {/* Botão exportar */}
          <div className="flex justify-end">
            <button onClick={exportarExcel} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              📥 Exportar Excel
            </button>
          </div>

        </div>
      )}
    </div>
  );
}