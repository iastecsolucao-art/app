import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // form para novo usuário
  const [novo, setNovo] = useState({ nome: "", email: "", empresa: "", role: "user" });

  const fetchUsuarios = () => {
    fetch("/api/admin/usuarios")
      .then(res => res.json())
      .then(setUsuarios)
      .catch(() => toast.error("Erro ao carregar usuários"))
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsuarios, []);

  const salvarNovo = async () => {
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo),
    });
    if (res.ok) {
      toast.success("Usuário criado!");
      fetchUsuarios();
      setNovo({ nome: "", email: "", empresa: "", role: "user" });
    } else {
      toast.error("Erro ao criar");
    }
  };

  const atualizar = async (u) => {
    const res = await fetch("/api/admin/usuarios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(u),
    });
    if (res.ok) {
      toast.success("Usuário atualizado!");
      fetchUsuarios();
    } else {
      toast.error("Erro ao atualizar");
    }
  };

  const excluir = async (id) => {
    if (!confirm("Deseja realmente excluir?")) return;
    const res = await fetch("/api/admin/usuarios", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      toast.success("Usuário excluído!");
      fetchUsuarios();
    } else {
      toast.error("Erro ao excluir");
    }
  };

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">👥 Usuários do Sistema</h1>

      {/* Novo */}
      <div className="mb-6 flex gap-2">
        <input placeholder="Nome" className="border p-2" value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })}/>
        <input placeholder="E-mail" className="border p-2" value={novo.email} onChange={e => setNovo({ ...novo, email: e.target.value })}/>
        <input placeholder="Empresa" className="border p-2" value={novo.empresa} onChange={e => setNovo({ ...novo, empresa: e.target.value })}/>
        <select className="border p-2" value={novo.role} onChange={e => setNovo({ ...novo, role: e.target.value })}>
          <option value="user">User</option>
          <option value="trial">Trial</option>
          <option value="admin">Admin</option>
        </select>
        <button className="bg-green-500 px-3 py-2 text-white rounded" onClick={salvarNovo}>➕ Criar</button>
      </div>

      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 border">Nome</th>
            <th className="px-4 py-2 border">E-mail</th>
            <th className="px-4 py-2 border">Empresa</th>
            <th className="px-4 py-2 border">Role</th>
            <th className="px-4 py-2 border">Expiração</th>
            <th className="px-4 py-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map(u => (
            <tr key={u.id} className="text-center border-t">
              <td className="px-4 py-2 border">
                <input className="border p-1 w-full" value={u.nome} onChange={e => setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, nome: e.target.value } : x))}/>
              </td>
              <td className="px-4 py-2 border">
                <input className="border p-1 w-full" value={u.email} onChange={e => setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, email: e.target.value } : x))}/>
              </td>
              <td className="px-4 py-2 border">
                <input className="border p-1 w-full" value={u.empresa || ""} onChange={e => setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, empresa: e.target.value } : x))}/>
              </td>
              <td className="px-4 py-2 border">
                <select value={u.role} onChange={e => setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, role: e.target.value } : x))}
                  className="border p-1">
                  <option value="user">User</option>
                  <option value="trial">Trial</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td className="px-4 py-2 border">
                <input type="date" value={u.expiracao ? u.expiracao.split("T")[0] : ""} 
                  onChange={e => setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, expiracao: e.target.value } : x))}
                  className="border p-1"/>
              </td>
              <td className="px-4 py-2 border">
                <button className="bg-blue-500 text-white px-2 py-1 mr-2 rounded" onClick={() => atualizar(u)}>💾 Salvar</button>
                <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => excluir(u.id)}>🗑 Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}