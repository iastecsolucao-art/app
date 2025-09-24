import { useEffect, useState } from "react";

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState([]);
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function carregar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profissionais");
      if (!res.ok) throw new Error("Erro ao carregar profissionais");
      const data = await res.json();
      setProfissionais(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarProfissional() {
    if (!nome.trim()) {
      setError("O nome é obrigatório");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profissionais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, especialidade }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar profissional");
      }
      setNome("");
      setEspecialidade("");
      await carregar();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function excluir(id) {
    if (!confirm("Confirma exclusão do profissional?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/profissionais/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao excluir profissional");
      }
      await carregar();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4">👩‍⚕️ Cadastro de Profissionais</h1>

      {error && (
        <div className="mb-4 p-2 bg-red-200 text-red-800 rounded">{error}</div>
      )}

      <div className="mb-4 flex gap-2 flex-wrap">
        <input
          className="border p-2 flex-grow min-w-[150px]"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={loading}
        />
        <input
          className="border p-2 flex-grow min-w-[150px]"
          placeholder="Especialidade"
          value={especialidade}
          onChange={(e) => setEspecialidade(e.target.value)}
          disabled={loading}
        />
        <button
          onClick={salvarProfissional}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {loading && profissionais.length === 0 ? (
        <p>Carregando profissionais...</p>
      ) : (
        <table className="w-full border table-auto">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Nome</th>
              <th className="p-2 border">Especialidade</th>
              <th className="p-2 border">Ações</th>
            </tr>
          </thead>
          <tbody>
            {profissionais.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center p-4">
                  Nenhum profissional cadastrado.
                </td>
              </tr>
            ) : (
              profissionais.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2 border">{p.nome}</td>
                  <td className="p-2 border">{p.especialidade || "-"}</td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => excluir(p.id)}
                      className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                      disabled={loading}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}