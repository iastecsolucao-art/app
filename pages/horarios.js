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

export default function CadastroHorario() {
  const { data: session, status } = useSession();
  const [profissionais, setProfissionais] = useState([]);
  const [form, setForm] = useState({
    profissional_id: "",
    dia_semana: "Segunda-feira",
    abertura: "",
    inicio_almoco: "",
    fim_almoco: "",
    intervalo_inicio: "",
    intervalo_fim: "",
    fechamento: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchProfissionais() {
      try {
        const res = await fetch("/api/profissionais", { credentials: "include" });
        if (!res.ok) throw new Error("Erro ao carregar profissionais");
        const data = await res.json();
        setProfissionais(data);
      } catch {
        setProfissionais([]);
      }
    }

    fetchProfissionais();
  }, [status]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!form.profissional_id) {
      setMessage("Selecione um profissional.");
      setLoading(false);
      return;
    }
    if (!form.abertura || !form.fechamento) {
      setMessage("Preencha os horários de abertura e fechamento.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/horarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMessage("Horário cadastrado com sucesso!");
        setForm({
          profissional_id: "",
          dia_semana: "Segunda-feira",
          abertura: "",
          inicio_almoco: "",
          fim_almoco: "",
          intervalo_inicio: "",
          intervalo_fim: "",
          fechamento: "",
        });
      } else {
        const data = await res.json();
        setMessage(data.error || "Erro ao cadastrar horário");
      }
    } catch {
      setMessage("Erro na conexão");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <p className="p-6">Carregando sessão...</p>;
  }

  if (status === "unauthenticated") {
    return <p className="p-6 text-red-600">Você precisa estar logado para acessar esta página.</p>;
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow mt-8">
      <h1 className="text-xl font-bold mb-4">Cadastrar Horário do Estabelecimento</h1>

      {message && (
        <div
          className={`mb-4 p-2 rounded ${
            message.toLowerCase().includes("sucesso")
              ? "bg-green-200 text-green-800"
              : "bg-red-200 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label className="block mb-1 font-semibold" htmlFor="profissional_id">
            Profissional
          </label>
          <select
            id="profissional_id"
            name="profissional_id"
            value={form.profissional_id}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
            disabled={loading}
          >
            <option value="">Selecione um profissional</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold" htmlFor="dia_semana">
            Dia da Semana
          </label>
          <select
            id="dia_semana"
            name="dia_semana"
            value={form.dia_semana}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
            disabled={loading}
          >
            {diasSemana.map((dia) => (
              <option key={dia} value={dia}>
                {dia}
              </option>
            ))}
          </select>
        </div>

        {["abertura", "inicio_almoco", "fim_almoco", "intervalo_inicio", "intervalo_fim", "fechamento"].map((campo) => (
          <div key={campo}>
            <label className="block mb-1 font-semibold" htmlFor={campo}>
              {campo
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </label>
            <input
              type="time"
              id={campo}
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
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar Horário"}
        </button>
      </form>
    </div>
  );
}