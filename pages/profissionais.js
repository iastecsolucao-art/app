import { useEffect, useState } from "react";

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState([]);
  const [nome, setNome] = useState("");
  const [especialidade, setEspecialidade] = useState("");

  async function carregar() {
    const res = await fetch("/api/profissionais");
    setProfissionais(await res.json());
  }

  useEffect(() => { carregar(); }, []);

  async function salvarProfissional() {
    const res = await fetch("/api/profissionais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, especialidade }),
    });
    await res.json();
    setNome("");
    setEspecialidade("");
    carregar();
  }

  async function excluir(id) {
    await fetch(`/api/profissionais/${id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">👩‍⚕️ Cadastro de Profissionais</h1>

      <div className="mb-4 flex gap-2">
        <input
          className="border p-2"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="Especialidade"
          value={especialidade}
          onChange={(e) => setEspecialidade(e.target.value)}
        />
        <button onClick={salvarProfissional} className="bg-blue-600 text-white px-4 py-2 rounded">Salvar</button>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">Nome</th>
            <th className="p-2">Especialidade</th>
            <th className="p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {profissionais.map(p => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.nome}</td>
              <td className="p-2">{p.especialidade}</td>
              <td className="p-2">
                <button 
                  onClick={() => excluir(p.id)} 
                  className="bg-red-600 text-white px-2 py-1 rounded">
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}