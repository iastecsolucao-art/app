import { useState } from "react";
import { uploadFile } from "../utils/api";

export default function UploadForm() {
  const [tipo, setTipo] = useState("produto");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  // exemplos de formato por tipo
  const exemplos = {
    produto: {
      cabecalho: "descricao,codbarra,empresa",
      exemplo: "Caneta Azul,1234567890123,iastec"
    },
    usuario: {
      cabecalho: "nome,email",
      exemplo: "Adriano Silva,adriano@email.com"
    },
    contagem: {
      cabecalho: "area,codbarra,loja,data",
      exemplo: "Mesa1,1234567890123,Eldorado,2025-09-16"
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Escolha um arquivo!");
      return;
    }

    try {
      const res = await uploadFile(file, tipo);
      setResult(res);
    } catch (err) {
      console.error("Erro no upload:", err);
      alert("Erro ao enviar arquivo!");
    }
  };

  const ex = exemplos[tipo];

  return (
    <div className="p-6 max-w-lg mx-auto border rounded shadow-md bg-white">
      <h2 className="text-xl font-bold mb-3">Upload de Cadastros</h2>

      <select
        className="border p-2 w-full mb-3"
        onChange={(e) => setTipo(e.target.value)}
        value={tipo}
      >
        <option value="produto">Produtos</option>
        <option value="usuario">Usuários</option>
        <option value="contagem">Contagem</option>
      </select>

      {/* Exemplo dinâmico por tipo */}
      <div className="mb-3 text-sm bg-gray-50 p-2 rounded border">
        <p><b>Formato esperado:</b></p>
        <p className="font-mono text-xs bg-gray-200 px-2 py-1 rounded mb-1">{ex.cabecalho}</p>
        <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{ex.exemplo}</p>
        <p className="text-[11px] text-gray-500 mt-1">Aceita .csv, .xlsx ou .txt</p>
      </div>

      <input
        type="file"
        accept=".csv,.xlsx,.txt"
        className="mb-3"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
          }
        }}
      />

      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Enviar
      </button>

      {result && (
        <pre className="bg-gray-100 mt-4 p-2 text-xs whitespace-pre-wrap">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}