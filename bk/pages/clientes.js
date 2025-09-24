import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  // form para novo cliente
  const [novo, setNovo] = useState({
    nome: "",
    telefone: "",
    email: "",
    observacao: "",
  });

  // carregar clientes da API com proteção para garantir array
  const carregar = () => {
    setLoading(true);
    fetch("/api/clientes")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClientes(data);
        } else {
          console.error("API clientes retornou dado inesperado:", data);
          setClientes([]);
          toast.error("Erro ao carregar clientes: formato inválido");
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar clientes:", err);
        toast.error("Erro ao carregar clientes");
        setClientes([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(carregar, []);

  // salvar novo cliente
  const salvarNovo = async () => {
    if (!novo.nome || !novo.telefone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novo),
      });

      if (res.ok) {
        toast.success("Cliente cadastrado!");
        carregar();
        setNovo({ nome: "", telefone: "", email: "", observacao: "" });
      } else {
        const data = await res.json();
        toast.error("Erro: " + data.error);
      }
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
      toast.error("Erro ao salvar cliente");
    }
  };

  // atualizar cliente existente
  const atualizar = async (c) => {
    if (!c.nome || !c.telefone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    try {
      const res = await fetch("/api/clientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });

      if (res.ok) {
        toast.success("Cliente atualizado!");
        carregar();
      } else {
        const data = await res.json();
        toast.error("Erro: " + data.error);
      }
    } catch (err) {
      console.error("Erro ao atualizar cliente:", err);
      toast.error("Erro ao atualizar cliente");
    }
  };

  // excluir cliente
  const excluir = async (id) => {
    if (!confirm("Deseja excluir este cliente?")) return;

    try {
      const res = await fetch("/api/clientes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        toast.success("Cliente excluído!");
        setClientes((prev) => prev.filter((c) => c.id !== id));
      } else {
        const data = await res.json();
        toast.error("Erro: " + data.error);
      }
    } catch (err) {
      console.error("Erro ao excluir cliente:", err);
      toast.error("Erro ao excluir cliente");
    }
  };

  if (loading) return <p className="p-6">Carregando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">👥 Cadastro de Clientes</h1>

      {/* Form Novo Cliente */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <input
          placeholder="Nome"
          className="border p-2 flex-1"
          value={novo.nome}
          onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
        />
        <input
          placeholder="Telefone"
          className="border p-2 flex-1"
          value={novo.telefone}
          onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
        />
        <input
          placeholder="Email"
          className="border p-2 flex-1"
          value={novo.email}
          onChange={(e) => setNovo({ ...novo, email: e.target.value })}
        />
        <input
          placeholder="Observação"
          className="border p-2 flex-1"
          value={novo.observacao}
          onChange={(e) => setNovo({ ...novo, observacao: e.target.value })}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={salvarNovo}
        >
          ➕ Salvar
        </button>
      </div>

      {/* Tabela Clientes */}
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-200">
          <tr>
            <th className="px-4 py-2 border">Nome</th>
            <th className="px-4 py-2 border">Telefone</th>
            <th className="px-4 py-2 border">Email</th>
            <th className="px-4 py-2 border">Observação</th>
            <th className="px-4 py-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(clientes) && clientes.map((c) => (
            <tr key={c.id} className="text-center border-t">
              <td className="px-4 py-2 border">
                <input
                  className="border p-1 w-full"
                  value={c.nome}
                  onChange={(e) =>
                    setClientes((prev) =>
                      prev.map((x) => (x.id === c.id ? { ...x, nome: e.target.value } : x))
                    )
                  }
                />
              </td>
              <td className="px-4 py-2 border">
                <input
                  className="border p-1 w-full"
                  value={c.telefone}
                  onChange={(e) =>
                    setClientes((prev) =>
                      prev.map((x) =>
                        x.id === c.id ? { ...x, telefone: e.target.value } : x
                      )
                    )
                  }
                />
              </td>
              <td className="px-4 py-2 border">
                <input
                  className="border p-1 w-full"
                  value={c.email || ""}
                  onChange={(e) =>
                    setClientes((prev) =>
                      prev.map((x) =>
                        x.id === c.id ? { ...x, email: e.target.value } : x
                      )
                    )
                  }
                />
              </td>
              <td className="px-4 py-2 border">
                <input
                  className="border p-1 w-full"
                  value={c.observacao || ""}
                  onChange={(e) =>
                    setClientes((prev) =>
                      prev.map((x) =>
                        x.id === c.id ? { ...x, observacao: e.target.value } : x
                      )
                    )
                  }
                />
              </td>
              <td className="px-4 py-2 border">
                <button
                  className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                  onClick={() => atualizar(c)}
                >
                  💾 Salvar
                </button>
                <button
                  className="bg-red-500 text-white px-2 py-1 rounded"
                  onClick={() => excluir(c.id)}
                >
                  🗑 Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}