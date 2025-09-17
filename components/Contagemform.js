import { useState } from "react";
import { salvarContagem } from "../utils/api";
import { CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/solid";

export default function ContagemForm() {
  const [area, setArea] = useState("");
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [contagem, setContagem] = useState([]);
  const [mensagem, setMensagem] = useState(null);

  const handleAdd = async () => {
    if (!area || !codigo) {
      setMensagem({ tipo: "erro", texto: "Informe a área e o código de barras!" });
      return;
    }
    try {
      const res = await salvarContagem(area, codigo, quantidade, 1); // usuário fixo/id mockado
      if (res && res.length > 0) {
        setContagem([...contagem, { codigo, quantidade }]);
        setMensagem({ tipo: "sucesso", texto: "Produto registrado!" });
        setCodigo("");
        setQuantidade(1);
      } else {
        setMensagem({ tipo: "erro", texto: "Produto não localizado no cadastro!" });
      }
    } catch (e) {
      setMensagem({ tipo: "erro", texto: "Erro ao salvar contagem." });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">📦 Contagem de Inventário</h2>

      {/* Mensagem de feedback */}
      {mensagem && (
        <div
          className={`flex items-center p-3 mb-4 rounded ${
            mensagem.tipo === "sucesso" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {mensagem.tipo === "sucesso" ? (
            <CheckCircleIcon className="w-6 h-6 mr-2" />
          ) : (
            <ExclamationCircleIcon className="w-6 h-6 mr-2" />
          )}
          <span>{mensagem.texto}</span>
        </div>
      )}

      {/* Formulário */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Área"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="border p-3 rounded-lg col-span-1"
        />
        <input
          type="text"
          placeholder="Código de Barras"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className="border p-3 rounded-lg col-span-1"
        />
        <input
          type="number"
          placeholder="Qtd"
          value={quantidade}
          min="1"
          onChange={(e) => setQuantidade(e.target.value)}
          className="border p-3 rounded-lg col-span-1"
        />
      </div>

      <div className="flex space-x-4 mb-8">
        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          ➕ Adicionar
        </button>
        <button
          className="bg-yellow-600 text-white px-6 py-3 rounded-lg hover:bg-yellow-700 transition"
        >
          💾 Salvar Parcial
        </button>
        <button
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
        >
          ✅ Finalizar Área
        </button>
      </div>

      {/* Lista Contagem */}
      <div className="bg-gray-50 rounded-lg shadow-inner p-4">
        <h3 className="font-semibold text-lg mb-3 text-gray-700">
          Itens registrados: {contagem.length}
        </h3>
        <ul className="divide-y">
          {contagem.map((item, idx) => (
            <li key={idx} className="py-2 flex justify-between text-sm text-gray-700">
              <span>📌 Código: {item.codigo}</span>
              <span>Qtd: {item.quantidade}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}