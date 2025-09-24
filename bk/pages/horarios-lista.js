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

export default function HorariosLista() {
  const { data: session, status } = useSession();
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [form, setForm] = useState({
    profissional_id: "",
    dias_semana: [], // array de dias selecionados
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
    carregarHorarios();
  }, [status]);

  async function carregarHorarios() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/horarios/list", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar horários");
      const data = await res.json();
      setHorarios(data);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  function iniciarEdicao(index) {
    const h = horarios[index];
    setEditIndex(index);
    setForm({
      profissional_id: h.profissional_id,
      dias_semana: h.dia_semana.split(",").map(d => d.trim()), // assume que dia_semana é string CSV
      abertura: h.abertura || "",
      inicio_almoco: h.inicio_almoco || "",
      fim_almoco: h.fim_almoco || "",
      intervalo_inicio: h.intervalo_inicio || "",
      intervalo_fim: h.intervalo_fim || "",
      fechamento: h.fechamento || "",
    });
    setMessage(null);
  }

  function cancelarEdicao() {
    setEditIndex(null);
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
    setForm(f => ({ ...f, [name]: value }));
  }

  async function salvarEdicao() {
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

    try {
      const payload = {
        profissional_id: form.profissional_id,
        dias_semana: form.dias_semana.join(","),
        abertura: form.abertura,
        inicio_almoco: form.inicio_almoco,
        fim_almoco: form.fim_almoco,
        intervalo_inicio: form.intervalo_inicio,
        intervalo_fim: form.intervalo_fim,
        fechamento: form.fechamento,
      };

      // Se estiver editando, envie o id para atualizar
      if (editIndex !== null) {
        payload.id = horarios[editIndex].id;
      }

      const res = await fetch(editIndex !== null ? "/api/horarios/update" : "/api/horarios/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar horário");
      }

      setMessage("Horário salvo com sucesso!");
      cancelarEdicao();
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
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-xl font-bold mb-6">Horários do Estabelecimento</h1>

      {message && (
        <div className={`mb-4 p-2 rounded ${message.toLowerCase().includes("sucesso") ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
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
              <td colSpan={5} className="text-center p-4">Nenhum horário cadastrado.</td>
            </tr>
          ) : (
            horarios.map((h, i) => (
              <tr key={h.id} className="border-t">
                <td className="p-2 border">{h.profissional_nome || h.profissional_id}</td>
                <td className="p-2 border">{h.dia_semana}</td>
                <td className="p-2 border">{h.abertura}</td>
                <td className="p-2 border">{h.fechamento}</td>
                <td className="p-2 border text-center">
                  <button
                    onClick={() => iniciarEdicao(i)}
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="text-lg font-semibold mb-4">{editIndex !== null ? "Editar Horário" : "Novo Horário"}</h2>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">Profissional</label>
        <input
          type="text"
          value={form.profissional_id}
          disabled
          className="w-full border px-3 py-2 rounded bg-gray-100"
          placeholder="Profissional (não editável aqui)"
        />
        {/* Para permitir editar profissional, substitua por select com lista de profissionais */}
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">Dias da Semana</label>
        <div className="flex flex-wrap gap-2">
          {diasSemana.map((dia) => (
            <label key={dia} className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={form.dias_semana.includes(dia)}
                onChange={() => toggleDiaSemana(dia)}
                disabled={loading}
              />
              <span>{dia}</span>
            </label>
          ))}
        </div>
      </div>

      {["abertura", "inicio_almoco", "fim_almoco", "intervalo_inicio", "intervalo_fim", "fechamento"].map((campo) => (
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
        onClick={salvarEdicao}
        disabled={loading}
        className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "Salvando..." : editIndex !== null ? "Salvar Alterações" : "Cadastrar Horário"}
      </button>

      {editIndex !== null && (
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