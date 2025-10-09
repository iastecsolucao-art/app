import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

function UploadPromocao({ empresaId }) {
  const [file, setFile] = useState(null);
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    console.log("empresaId recebido no componente:", empresaId);
  }, [empresaId]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && (f.type.startsWith("image/") || f.type.startsWith("video/"))) {
      setFile(f);
      setMessage(null);
    } else {
      setFile(null);
      setMessage("Por favor, selecione um arquivo de imagem ou vídeo válido.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage("Selecione um arquivo para upload.");
      return;
    }
    if (!descricao.trim()) {
      setMessage("Informe a descrição da promoção.");
      return;
    }
    if (!dataInicio || !dataFim) {
      setMessage("Informe as datas de início e fim.");
      return;
    }
    if (new Date(dataFim) < new Date(dataInicio)) {
      setMessage("A data fim deve ser igual ou posterior à data início.");
      return;
    }
    if (!empresaId) {
      setMessage("Erro: empresaId não está definido.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("descricao", descricao);
      formData.append("data_inicio", dataInicio);
      formData.append("data_fim", dataFim);
      formData.append("empresa_id", String(empresaId));

      const res = await fetch("https://n8n.iastec.servicos.ws/webhook-test/upload_app", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setMessage("Promoção cadastrada com sucesso!");
        setFile(null);
        setDescricao("");
        setDataInicio("");
        setDataFim("");
      } else {
        const data = await res.json();
        setMessage(data.error || "Erro ao cadastrar promoção.");
      }
    } catch (err) {
      setMessage("Erro de conexão ao enviar o arquivo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-xl font-bold mb-4">Upload de Promoção</h1>

      {message && (
        <p className={`mb-4 ${message.includes("sucesso") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <label className="block mb-2 font-semibold">
          Arquivo (imagem ou vídeo)
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={loading}
            className="mt-1 block w-full"
          />
        </label>

        <label className="block mb-2 font-semibold">
          Descrição
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            disabled={loading}
            className="w-full border rounded px-3 py-2 mt-1"
            rows={3}
            required
          />
        </label>

        <label className="block mb-2 font-semibold">
          Data Início
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            disabled={loading}
            className="w-full border rounded px-3 py-2 mt-1"
            required
          />
        </label>

        <label className="block mb-2 font-semibold">
          Data Fim
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            disabled={loading}
            className="w-full border rounded px-3 py-2 mt-1"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {loading ? "Enviando..." : "Enviar Promoção"}
        </button>
      </form>
    </div>
  );
}

export default function PaginaUpload() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Carregando...</p>;
  }

  if (!session) {
    return <p>Você precisa estar logado para acessar esta página.</p>;
  }

  const empresaId = session.user?.empresa_id;

  return (
    <div>
      <h1>Cadastro de Promoção</h1>
      <UploadPromocao empresaId={empresaId} />
    </div>
  );
}