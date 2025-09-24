import { useState } from "react";

const formatosEsperados = {
  produtos: {
    label: "Produtos",
    exemplo: "descricao,codbarra,empresa\nCaneta Azul,1234567890123,iastec",
    filename: "modelo_produtos.csv",
  },
  tabela_apoio: {
    label: "Tabela Apoio",
    exemplo: "setor,operador,loja\nMESA1,ADRIANO,ANALIA",
    filename: "modelo_tabela_apoio.csv",
  },
};

export default function UploadForm() {
  const [tipo, setTipo] = useState("produtos");
  const [file, setFile] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Escolha um arquivo para enviar.");
      return;
    }
    setEnviando(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", tipo);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Erro: " + (err.error || "Falha no upload"));
      } else {
        alert("Upload realizado com sucesso!");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar arquivo.");
    }
    setEnviando(false);
  };

  const downloadModelo = () => {
    const csvContent = formatosEsperados[tipo].exemplo;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", formatosEsperados[tipo].filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded shadow-md w-full max-w-md mx-4 sm:mx-auto"
    >
      <h2 className="text-xl font-bold mb-4">Upload de Cadastros</h2>

      <label htmlFor="tipoCadastro" className="block mb-4">
        <span className="font-semibold">Tipo de Cadastro</span>
        <select
          id="tipoCadastro"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
        >
          {Object.entries(formatosEsperados).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-4">
        <span className="font-semibold">Formato esperado:</span>
        <pre className="bg-gray-100 p-2 rounded mt-1 text-sm whitespace-pre-wrap">
          {formatosEsperados[tipo].exemplo}
        </pre>
        <button
          type="button"
          onClick={downloadModelo}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          📥 Baixar modelo CSV
        </button>
      </div>

      {/* Importante para o backend */}
      <label htmlFor="fileUpload" className="block mb-4">
        <input
          id="fileUpload"
          type="file"
          name="file"
          accept=".csv,.xlsx,.txt"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </label>

      <button
        type="submit"
        disabled={enviando}
        className={`w-full py-2 rounded text-white font-bold ${
          enviando ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {enviando ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}