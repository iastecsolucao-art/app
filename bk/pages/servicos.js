import { useEffect, useState } from "react";

export default function ServicosPage() {
  const [servicos, setServicos] = useState([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [duracao, setDuracao] = useState(60);

  async function carregar() {
    const res = await fetch("/api/servicos");
    setServicos(await res.json());
  }

  useEffect(() => { carregar(); }, []);

  async function salvarServico() {
    const res = await fetch("/api/servicos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, descricao, duracao_minutos: duracao })
    });
    await res.json();
    setNome(""); setDescricao(""); setDuracao(60);
    carregar();
  }

  async function excluir(id) {
    await fetch(`/api/servicos/${id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">⚙️ Cadastro de Serviços</h1>

      <div className="mb-4">
        <input className="border p-2 mr-2" value={nome} placeholder="Nome" onChange={(e)=>setNome(e.target.value)} />
        <input className="border p-2 mr-2" value={descricao} placeholder="Descrição" onChange={(e)=>setDescricao(e.target.value)} />
        <input className="border p-2 mr-2 w-24" type="number" value={duracao} onChange={(e)=>setDuracao(e.target.value)} />
        <button onClick={salvarServico} className="bg-blue-600 text-white px-4 py-2 rounded">Salvar</button>
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
          {servicos.map(s => (
            <tr key={s.id} className="border-t">
              <td className="p-2">{s.nome}</td>
              <td className="p-2">{s.descricao}</td>
              <td className="p-2">{s.duracao_minutos} min</td>
              <td className="p-2">
                <button onClick={()=>excluir(s.id)} className="bg-red-600 text-white px-2 py-1 rounded">Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}