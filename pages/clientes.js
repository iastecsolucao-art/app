import { useEffect, useState } from "react";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [observacao, setObservacao] = useState("");

  async function carregar() {
    const res = await fetch("/api/clientes");
    setClientes(await res.json());
  }

  useEffect(() => { carregar(); }, []);

  async function salvarCliente() {
    if (!nome || !telefone) {
      alert("⚠️ Nome e telefone são obrigatórios!");
      return;
    }

    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone, email, observacao }),
    });
    await res.json();
    setNome(""); setTelefone(""); setEmail(""); setObservacao("");
    carregar();
  }

  async function excluir(id) {
    await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    carregar();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">👤 Cadastro de Clientes</h1>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input className="border p-2" placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input className="border p-2" placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        <input className="border p-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="border p-2" placeholder="Observação" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        <button onClick={salvarCliente} className="bg-blue-600 text-white px-4 py-2 rounded col-span-1 md:col-span-4 mt-2">Salvar</button>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">Nome</th>
            <th className="p-2">Telefone</th>
            <th className="p-2">Email</th>
            <th className="p-2">Observação</th>
            <th className="p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {clientes.map(c => (
            <tr key={c.id} className="border-t">
              <td className="p-2">{c.nome}</td>
              <td className="p-2">{c.telefone}</td>
              <td className="p-2">{c.email}</td>
              <td className="p-2">{c.observacao}</td>
              <td className="p-2">
                <button onClick={() => excluir(c.id)} className="bg-red-600 text-white px-2 py-1 rounded">Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}