import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function Acessos() {
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    fetch("/api/usuarios/listar")
      .then(res => res.json())
      .then(setUsuarios)
      .catch(err => {
        console.error("Erro ao carregar usuários:", err);
        toast.error("Erro ao carregar usuários");
      });
  }, []);

  const toggleAcesso = async (usuario_id, modulo, valor) => {
    try {
      const res = await fetch("/api/usuarios/acessos_update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id, modulo, valor }),
      });
      const data = await res.json();
      if (res.ok) {
        // atualiza no estado local
        setUsuarios(prev =>
          prev.map(u =>
            u.id === usuario_id ? { ...u, [modulo]: valor } : u
          )
        );
        toast.success(`✅ ${modulo} ${valor ? "liberado" : "bloqueado"}`);
      } else {
        toast.error(data.error || "Erro ao atualizar");
      }
    } catch (err) {
      console.error("Erro:", err);
      toast.error("Erro na conexão");
    }
  };

  const modulos = ["dashboard", "inventario", "produtos", "compras", "comercial", "servicos"];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">👥 Gerenciar Acessos dos Usuários</h1>
      <table className="min-w-full border border-gray-300">
    <thead className="bg-gray-200">
  <tr>
    <th className="px-4 py-2 border">Usuário</th>
    <th className="px-4 py-2 border">E-mail</th>
    <th className="px-4 py-2 border">Role</th>
    {modulos.map(m => (
      <th key={m} className="px-4 py-2 border capitalize">{m}</th>
    ))}
  </tr>
</thead>
<tbody>
  {usuarios.map(u => (
    <tr key={u.id} className="text-center border-t">
      <td className="px-4 py-2 border">{u.nome}</td>
      <td className="px-4 py-2 border">{u.email}</td>
      <td className="px-4 py-2 border">{u.role}</td>
      {modulos.map(m => (
        <td key={m} className="px-4 py-2 border">
          <input
            type="checkbox"
            checked={u[m] ?? true}
            onChange={e => toggleAcesso(u.id, m, e.target.checked)}
          />
        </td>
      ))}
    </tr>
  ))}
</tbody>
      </table>
    </div>
  );
}