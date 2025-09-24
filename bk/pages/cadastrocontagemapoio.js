import { useState } from "react";

export default function CadastroContagemApoio() {
  const [setor, setSetor] = useState("");
  const [operador, setOperador] = useState("");
  const [loja, setLoja] = useState("");
  const [loading, setLoading] = useState(false);

  const salvar = async () => {
    if (!setor.trim() || !operador.trim() || !loja.trim()) {
      alert("⚠️ Preencha todos os campos.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/contagem_apoio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setor, operador, loja }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Erro: " + (err.error || res.statusText));
        setLoading(false);
        return;
      }
      alert("Cadastro salvo com sucesso!");
      setSetor("");
      setOperador("");
      setLoja("");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cadastro");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-6">Cadastro de Contagem Apoio</h1>
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <label className="block mb-4">
          <span className="font-semibold">Setor</span>
          <input
            type="text"
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome do setor"
          />
        </label>
        <label className="block mb-4">
          <span className="font-semibold">Operador</span>
          <input
            type="text"
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome do operador"
          />
        </label>
        <label className="block mb-6">
          <span className="font-semibold">Loja</span>
          <input
            type="text"
            value={loja}
            onChange={(e) => setLoja(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome da loja"
          />
        </label>
        <button
          onClick={salvar}
          disabled={loading}
          className={`w-full py-3 rounded font-bold text-white ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}