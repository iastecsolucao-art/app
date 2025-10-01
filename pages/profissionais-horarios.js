import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

const diasSemana = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export default function ProfissionaisHorarios() {
  const { data: session, status } = useSession();
  const [horarios, setHorarios] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    profissional_id: "",
    dias_semana: [],
    abertura: "",
    inicio_almoco: "",
    fim_almoco: "",
    intervalo_inicio: "",
    intervalo_fim: "",
    fechamento: "",
  });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    carregarProfissionais();
    carregarHorarios();
  }, [status]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  async function carregarProfissionais() {
    try {
      const res = await fetch("/api/profissionais", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar profissionais");
      const data = await res.json();
      setProfissionais(data);
    } catch {
      setProfissionais([]);
    }
  }

  async function carregarHorarios() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profissionais_horarios", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar horários");
      const data = await res.json();
      setHorarios(data);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleDiaSemana(dia) {
    setForm(f => {
      const dias = f.dias_semana.includes(dia)
        ? f.dias_semana.filter(d => d !== dia)
        : [...f.dias_semana, dia];
      return { ...f, dias_semana: dias };
    });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({
      ...f,
      [name]: name === "profissional_id" ? Number(value) : value,
    }));
  }

  function iniciarEdicao(horario) {
    setEditId(horario.id);
    setForm({
      profissional_id: horario.profissional_id,
      dias_semana: [horario.dia_semana], // único dia para edição
      abertura: horario.abertura || "",
      inicio_almoco: horario.inicio_almoco || "",
      fim_almoco: horario.fim_almoco || "",
      intervalo_inicio: horario.intervalo_inicio || "",
      intervalo_fim: horario.intervalo_fim || "",
      fechamento: horario.fechamento || "",
    });
    setMessage(null);
  }

  function cancelarEdicao() {
    setEditId(null);
    setForm({
      profissional_id: "",
      dias_semana: [],
      abertura: "",
      inicio_almoco: "",
      fim_almoco: "",
      intervalo_inicio: "",
      intervalo_fim: "",
      fechamento: "",
    });
    setMessage(null);
  }

  async function salvar() {
    if (!form.profissional_id) {
      setMessage("Selecione um profissional.");
      return;
    }
    if (form.dias_semana.length === 0) {
      setMessage("Selecione pelo menos um dia da semana.");
      return;
    }
    if (!form.abertura || !form.fechamento) {
      setMessage("Preencha os horários de abertura e fechamento.");
      return;
    }

    setLoading(true);
    setMessage(null);

    const payload = {
      profissional_id: form.profissional_id,
      dia_semana: form.dias_semana, // envia array direto
      abertura: form.abertura,
      inicio_almoco: form.inicio_almoco,
      fim_almoco: form.fim_almoco,
      intervalo_inicio: form.intervalo_inicio,
      intervalo_fim: form.intervalo_fim,
      fechamento: form.fechamento,
    };

    try {
      const url = editId ? `/api/profissionais_horarios/${editId}` : "/api/profissionais_horarios";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar horário");
      }

      setMessage(editId ? "Horário atualizado com sucesso!" : "Horário criado com sucesso!");
      cancelarEdicao();
      carregarHorarios();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function excluir(id) {
    if (!confirm("Confirma exclusão do horário?")) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/profissionais_horarios/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao excluir horário");
      }

      setMessage("Horário excluído com sucesso!");
      if (editId === id) cancelarEdicao();
      carregarHorarios();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return <p>Carregando sessão...</p>;
  if (status === "unauthenticated") return <p>Você precisa estar logado para acessar esta página.</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-2xl font-bold mb-6">Horários dos Profissionais</h1>

      {message && (
        <div className={`mb-4 p-3 rounded ${message.toLowerCase().includes("sucesso") ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
          {message}
        </div>
      )}

      <table className="w-full border border-gray-300 mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Profissional</th>
            <th className="p-2 border">Dias da Semana</th>
            <th className="p-2 border">Abertura</th>
            <th className="p-2 border">Fechamento</th>
            <th className="p-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {horarios.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center p-4">Nenhum horário cadastrado.</td>
            </tr>
          ) : (
            horarios.map(h => (
              <tr key={h.id} className="border-t">
                <td className="p-2 border">{h.profissional_nome || h.profissional_id}</td>
                <td className="p-2 border">{h.dia_semana}</td>
                <td className="p-2 border">{h.abertura}</td>
                <td className="p-2 border">{h.fechamento}</td>
                <td className="p-2 border text-center space-x-2">
                  <button
                    onClick={() => iniciarEdicao(h)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    disabled={loading}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => excluir(h.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
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

      <h2 className="text-xl font-semibold mb-4">{editId ? "Editar Horário" : "Novo Horário"}</h2>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">Profissional</label>
        <select
          name="profissional_id"
          value={form.profissional_id}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          disabled={loading}
        >
          <option value="">Selecione um profissional</option>
          {profissionais.map(p => (
            <option key={p.id} value={p.id}>
              {p.nome} {p.especialidade ? `- ${p.especialidade}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">Dias da Semana</label>
        <div className="flex flex-wrap gap-3">
          {diasSemana.map(dia => (
            <label key={dia} className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={form.dias_semana.includes(dia)}
                onChange={() => toggleDiaSemana(dia)}
                disabled={loading || editId !== null} // bloqueia múltiplos dias na edição
              />
              <span>{dia}</span>
            </label>
          ))}
        </div>
        {editId !== null && (
          <p className="text-sm text-gray-600 mt-1">Na edição, só é possível alterar um dia por vez.</p>
        )}
      </div>

      {["abertura", "inicio_almoco", "fim_almoco", "intervalo_inicio", "intervalo_fim", "fechamento"].map(campo => (
        <div key={campo} className="mb-4">
          <label className="block mb-1 font-semibold">{campo.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</label>
          <input
            type="time"
            name={campo}
            value={form[campo]}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required={campo === "abertura" || campo === "fechamento"}
            disabled={loading}
          />
        </div>
      ))}

      <button
        onClick={salvar}
        disabled={loading}
        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Salvando..." : editId ? "Salvar Alterações" : "Cadastrar Horário"}
      </button>

      {editId && (
        <button
          onClick={cancelarEdicao}
          disabled={loading}
          className="ml-4 bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500 disabled:opacity-50"
        >
          Cancelar
        </button>
      )}
    </div>
  );
}