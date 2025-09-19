import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Dialog } from "@headlessui/react";
import { useRouter } from "next/router";

export default function Agendamento() {
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

  const router = useRouter();

  // 🔹 Carregar dados
  useEffect(() => {
    fetch("/api/servicos").then(res => res.json()).then(setServicos).catch(console.error);
    fetch("/api/profissionais").then(res => res.json()).then(setProfissionais).catch(console.error);
    fetch("/api/clientes").then(res => res.json()).then(setClientes).catch(console.error);
    fetch("/api/calendar/list").then(res => res.json()).then(setEvents).catch(console.error);
  }, []);

  const handleClienteChange = (id) => {
    setCliente(id);
    const c = clientes.find(c => c.id == id);
    if (c) {
      setNome(c.nome);
      setTelefone(c.telefone.toString());
    }
  };

  const handleDateClick = (info) => {
    const dateStr = info.dateStr;
    setSelectedDate(dateStr);

    const hours = [];
    for (let h = 8; h <= 18; h++) hours.push(`${h.toString().padStart(2, "0")}:00`);

    const dayEvents = events.filter(ev => ev.start.startsWith(dateStr));
    const occupied = dayEvents.map(ev => {
      const d = new Date(ev.start);
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    });

    const freeHours = hours.filter(h => !occupied.includes(h));
    setAvailableHours(freeHours);
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
        setEvents(await novaLista.json());
        setIsOpen(false);
        setCliente(""); setNome(""); setTelefone("");
        setServico(""); setProfissional(""); setObs(""); setSelectedHour("");
      } else {
        alert("Erro: " + (data.error || "Não foi possível reservar"));
      }
    } catch (err) {
      console.error("Erro ao reservar:", err);
      alert("Erro de conexão ao reservar");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📅 Agendamento de Serviço</h1>

      {/* Calendário */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        timeZone="local"
        height="auto"
      />

      {/* Lista mobile abaixo do calendário */}
      <div className="mt-6">
        <h2 className="font-semibold text-lg mb-2">📋 Agendamentos Efetuados</h2>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((ev, idx) => {
              const d = new Date(ev.start);
              return (
                <div key={idx} className="bg-white shadow p-3 rounded border border-gray-200">
                  <p className="text-sm text-gray-600">
                    📅 <strong>{d.toLocaleDateString()}</strong> às{" "}
                    <strong>{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                  </p>
                  <p className="text-gray-800">👤 {ev.nome || ev.title || "Cliente"}</p>
                  {ev.servico && <p className="text-gray-500">💇 Serviço: {ev.servico}</p>}
                  {ev.profissional && <p className="text-gray-500">👨‍🔧 Profissional: {ev.profissional}</p>}

                  {/* 🔹 Status visual */}
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
                              obs: ev.descricao || ""
                            })
                          });
                          const data = await resp.json();
                          if (resp.ok) {
                            alert("✅ Evento importado para o sistema!");
                            // 🔹 redireciona para tela de completar
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

      {/* Modal de novo agendamento */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <Dialog.Title className="text-lg font-bold mb-4">Novo Agendamento</Dialog.Title>

            <p className="text-sm text-gray-500 mb-4">
              Data selecionada: <b>{selectedDate && selectedDate.split("-").reverse().join("/")}</b>
            </p>

            {/* Cliente */}
            <select value={cliente} onChange={(e) => handleClienteChange(e.target.value)} className="w-full px-3 py-2 border rounded mb-3">
              <option value="">Selecione o cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome} - {c.telefone}</option>
              ))}
            </select>

            <input type="text" placeholder="Nome" value={nome} readOnly className="w-full px-3 py-2 border rounded mb-3 bg-gray-100"/>
            <input type="tel" placeholder="Telefone" value={telefone} readOnly className="w-full px-3 py-2 border rounded mb-3 bg-gray-100"/>

            {/* Profissional */}
            <select value={profissional} onChange={(e) => setProfissional(e.target.value)} className="w-full px-3 py-2 border rounded mb-3">
              <option value="">Selecione o profissional</option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>{p.nome} {p.especialidade && `- ${p.especialidade}`}</option>
              ))}
            </select>

            {/* Serviço */}
            <select value={servico} onChange={(e) => setServico(e.target.value)} className="w-full px-3 py-2 border rounded mb-3">
              <option value="">Selecione o serviço</option>
              {Array.isArray(servicos) && servicos.map(s => (
                <option key={s.id} value={s.nome}>{s.nome}</option>
              ))}
            </select>

            {/* Horário */}
            <select value={selectedHour} onChange={(e) => setSelectedHour(e.target.value)} className="w-full px-3 py-2 border rounded mb-3">
              <option value="">Selecione o horário</option>
              {availableHours.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <textarea placeholder="Observações" value={obs} onChange={(e) => setObs(e.target.value)} className="w-full px-3 py-2 border rounded mb-3"/>

            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setIsOpen(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancelar</button>
              <button onClick={reservarHorario} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Confirmar</button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}