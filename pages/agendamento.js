import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Dialog } from "@headlessui/react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

export default function Agendamento() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [servico, setServico] = useState("");
  const [profissional, setProfissional] = useState("");
  const [cliente, setCliente] = useState("");
  const [obs, setObs] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [availableHours, setAvailableHours] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [clientes, setClientes] = useState([]);

  // Função para filtrar horários excluindo intervalo de almoço
  function filtrarHorarios(horarios, inicioAlmoco, fimAlmoco) {
    if (!inicioAlmoco || !fimAlmoco) return horarios;
    const inicio = inicioAlmoco.split(":").map(Number);
    const fim = fimAlmoco.split(":").map(Number);

    return horarios.filter((h) => {
      const [hHora, hMin] = h.split(":").map(Number);
      if (hHora > inicio[0] && hHora < fim[0]) return false;
      if (hHora === inicio[0] && hMin >= inicio[1]) return false;
      if (hHora === fim[0] && hMin < fim[1]) return false;
      return true;
    });
  }

  // Carregar dados iniciais e eventos
  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/servicos")
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setServicos(data) : setServicos([])))
      .catch(() => setServicos([]));

    fetch("/api/profissionais")
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setProfissionais(data) : setProfissionais([])))
      .catch(() => setProfissionais([]));

    fetch("/api/clientes")
      .then((res) => res.json())
      .then((data) => (Array.isArray(data) ? setClientes(data) : setClientes([])))
      .catch(() => setClientes([]));

    fetch("/api/calendar/list")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setEvents([]);
          return;
        }

        const googleIdsInDb = new Set(
          data.filter(ev => ev.source === "db" && ev.gcal_event_id).map(ev => ev.gcal_event_id)
        );

        const filteredEvents = data.filter(ev => {
          if (ev.source === "google" && googleIdsInDb.has(ev.gcal_event_id)) {
            return false;
          }
          return true;
        });

        const uniqueEvents = [];
        const seenKeys = new Set();
        filteredEvents.forEach(ev => {
          const key = ev.gcal_event_id || `db_${ev.id}`;
          if (!seenKeys.has(key)) {
            uniqueEvents.push(ev);
            seenKeys.add(key);
          }
        });

        setEvents(uniqueEvents);
      })
      .catch(() => setEvents([]));
  }, [status]);

  // Buscar horários disponíveis via API customizada e filtrar intervalo de almoço
  useEffect(() => {
    if (!profissional || !servico || !selectedDate) {
      setAvailableHours([]);
      return;
    }

    async function fetchHorariosDisponiveis() {
      try {
        const res = await fetch(
          `/api/agendamentos_horarios?profissional_id=${profissional}&servico_nome=${encodeURIComponent(servico)}&data=${selectedDate}`
        );
        if (!res.ok) {
          console.error("Erro ao buscar horários:", await res.text());
          setAvailableHours([]);
          return;
        }
        const data = await res.json();

        // Aplica filtro para remover horários do intervalo de almoço
        const horariosFiltrados = filtrarHorarios(
          data.horarios || [],
          data.inicio_almoco,
          data.fim_almoco
        );

        setAvailableHours(horariosFiltrados);
      } catch (err) {
        console.error("Erro ao buscar horários disponíveis:", err);
        setAvailableHours([]);
      }
    }

    fetchHorariosDisponiveis();
  }, [profissional, servico, selectedDate]);

  const handleClienteChange = (id) => {
    setCliente(id);
    const c = clientes.find((c) => c.id == id);
    if (c) {
      setNome(c.nome);
      setTelefone(c.telefone.toString());
    } else {
      setNome("");
      setTelefone("");
    }
  };

  const handleDateClick = (info) => {
    const dateStr = info.dateStr;
    setSelectedDate(dateStr);
    setSelectedHour("");
    setIsOpen(true);
  };

  async function reservarHorario() {
    if (!cliente || !nome || !telefone || !servico || !profissional || !selectedHour) {
      alert("⚠️ Preencha todos os campos!");
      return;
    }

    let fone = telefone.replace(/\D/g, "");
    if (!fone.startsWith("55")) fone = "55" + fone;
    const start = `${selectedDate}T${selectedHour}:00`;

    try {
      const res = await fetch("/api/calendar/reservar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente, nome, telefone: fone, start, servico, obs, profissional }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || "✅ Reserva feita!");
        const novaLista = await fetch("/api/calendar/list");
        const dataEvents = await novaLista.json();

        if (!Array.isArray(dataEvents)) {
          setEvents([]);
          return;
        }

        const googleIdsInDb = new Set(
          dataEvents.filter(ev => ev.source === "db" && ev.gcal_event_id).map(ev => ev.gcal_event_id)
        );

        const filteredEvents = dataEvents.filter(ev => {
          if (ev.source === "google" && googleIdsInDb.has(ev.gcal_event_id)) {
            return false;
          }
          return true;
        });

        const uniqueEvents = [];
        const seenKeys = new Set();
        filteredEvents.forEach(ev => {
          const key = ev.gcal_event_id || `db_${ev.id}`;
          if (!seenKeys.has(key)) {
            uniqueEvents.push(ev);
            seenKeys.add(key);
          }
        });

        setEvents(uniqueEvents);

        setIsOpen(false);
        setCliente("");
        setNome("");
        setTelefone("");
        setServico("");
        setProfissional("");
        setObs("");
        setSelectedHour("");
      } else {
        alert("Erro: " + (data.error || "Não foi possível reservar"));
      }
    } catch (err) {
      console.error("Erro ao reservar:", err);
      alert("Erro de conexão ao reservar");
    }
  }

  if (status === "loading") {
    return <p className="p-6">Carregando sessão...</p>;
  }

  if (status === "unauthenticated") {
    return <p className="p-6 text-red-600">Você precisa estar logado para acessar esta página.</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📅 Agendamento de Serviço</h1>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        timeZone="local"
        height="auto"
      />

      <div className="mt-6">
        <h2 className="font-semibold text-lg mb-2">📋 Agendamentos Efetuados</h2>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((ev, idx) => {
              const d = new Date(ev.start);
              return (
                <div key={idx} className="bg-white shadow p-3 rounded border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">ID: {ev.id || ev.calendar_id}</p>
                  <p className="text-sm text-gray-600">
                    📅 <strong>{d.toLocaleDateString()}</strong> às{" "}
                    <strong>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                  </p>
                  <p className="text-gray-800">👤 {ev.nome || ev.title || "Cliente"}</p>
                  {ev.servico && <p className="text-gray-500">💇 Serviço: {ev.servico}</p>}
                  {ev.profissional && <p className="text-gray-500">👨‍🔧 Profissional: {ev.profissional}</p>}

                  {ev.importado ? (
                    <span className="inline-block mt-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      ✔ Importado
                    </span>
                  ) : (
                    ev.source === "google" && (
                      <button
                        onClick={async () => {
                          const resp = await fetch("/api/calendar/importar", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              gcal_event_id: ev.gcal_event_id,
                              title: ev.title,
                              start: ev.start,
                              end: ev.end,
                              nome: ev.nome || null,
                              telefone: ev.telefone || null,
                              servico: ev.servico || null,
                              profissional_id: null,
                              cliente_id: null,
                              obs: ev.descricao || "",
                            }),
                          });
                          const data = await resp.json();
                          if (resp.ok) {
                            alert("✅ Evento importado para o sistema!");
                            router.push("/agendamentos/completar");
                          } else {
                            alert("Erro ao importar: " + data.error);
                          }
                        }}
                        className="mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        Importar para o sistema
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">Nenhum agendamento encontrado</p>
        )}
      </div>

      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <Dialog.Title className="text-lg font-bold mb-4">Novo Agendamento</Dialog.Title>

            <p className="text-sm text-gray-500 mb-4">
              Data selecionada: <b>{selectedDate ? selectedDate.split("-").reverse().join("/") : ""}</b>
            </p>

            <select
              value={cliente}
              onChange={(e) => handleClienteChange(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
            >
              <option value="">Selecione o cliente</option>
              {Array.isArray(clientes) &&
                clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} - {c.telefone}
                  </option>
                ))}
            </select>

            <input
              type="text"
              placeholder="Nome"
              value={nome}
              readOnly
              className="w-full px-3 py-2 border rounded mb-3 bg-gray-100"
            />
            <input
              type="tel"
              placeholder="Telefone"
              value={telefone}
              readOnly
              className="w-full px-3 py-2 border rounded mb-3 bg-gray-100"
            />

            <select
              value={profissional}
              onChange={(e) => setProfissional(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
            >
              <option value="">Selecione o profissional</option>
              {Array.isArray(profissionais) &&
                profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} {p.especialidade && `- ${p.especialidade}`}
                  </option>
                ))}
            </select>

            <select
              value={servico}
              onChange={(e) => setServico(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
            >
              <option value="">Selecione o serviço</option>
              {Array.isArray(servicos) &&
                servicos.map((s) => (
                  <option key={s.id} value={s.nome}>
                    {s.nome}
                  </option>
                ))}
            </select>

            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
            >
              <option value="">Selecione o horário</option>
              {availableHours.length > 0 ? (
                availableHours.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))
              ) : (
                <option disabled>Nenhum horário disponível</option>
              )}
            </select>

            <textarea
              placeholder="Observações"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
            />

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={reservarHorario}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirmar
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}