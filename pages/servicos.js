import { useEffect, useState } from "react";

export default function ServicosPage() {
  const [servicos, setServicos] = useState([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [duracao, setDuracao] = useState(60);
  const [editandoId, setEditandoId] = useState(null); // ID do serviço que está sendo editado

  async function carregar() {
    const res = await fetch("/api/servicos");
    setServicos(await res.json());
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarServico() {
    if (editandoId) {
      // Atualizar serviço existente
      const res = await fetch(`/api/servicos/${editandoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao, duracao_minutos: duracao }),
      });
      await res.json();
      setEditandoId(null);
    } else {
      // Criar novo serviço
      const res = await fetch("/api/servicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao, duracao_minutos: duracao }),
      });
      await res.json();
    }
    setNome("");
    setDescricao("");
    setDuracao(60);
    carregar();
  }

  async function excluir(id) {
    await fetch(`/api/servicos/${id}`, { method: "DELETE" });
    // Se estiver editando o serviço excluído, limpa o formulário
    if (editandoId === id) {
      setEditandoId(null);
      setNome("");
      setDescricao("");
      setDuracao(60);
    }
    carregar();
  }

  function editarServico(servico) {
    setNome(servico.nome);
    setDescricao(servico.descricao);
    setDuracao(servico.duracao_minutos);
    setEditandoId(servico.id);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setNome("");
    setDescricao("");
    setDuracao(60);
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">⚙️ Cadastro de Serviços</h1>

      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          className="border p-2"
          value={nome}
          placeholder="Nome"
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          className="border p-2"
          value={descricao}
          placeholder="Descrição"
          onChange={(e) => setDescricao(e.target.value)}
        />
        <input
          className="border p-2 w-24"
          type="number"
          value={duracao}
          onChange={(e) => setDuracao(e.target.value)}
          min={1}
        />
        <button
          onClick={salvarServico}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {editandoId ? "Atualizar" : "Salvar"}
        </button>
        {editandoId && (
          <button
            onClick={cancelarEdicao}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Cancelar
          </button>
        )}
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">Nome</th>
            <th className="p-2">Descrição</th>
            <th className="p-2">Duração</th>
            <th className="p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {servicos.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="p-2">{s.nome}</td>
              <td className="p-2">{s.descricao}</td>
              <td className="p-2">{s.duracao_minutos} min</td>
              <td className="p-2 flex gap-2">
                <button
                  onClick={() => editarServico(s)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluir(s.id)}
                  className="bg-red-600 text-white px-2 py-1 rounded"
                >
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