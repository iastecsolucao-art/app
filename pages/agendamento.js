import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction"; 
import { Dialog } from "@headlessui/react";

export default function Agendamento() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(""); 
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [servico, setServico] = useState("");
  const [profissional, setProfissional] = useState("");
  const [cliente, setCliente] = useState(""); // ID do cliente selecionado
  const [obs, setObs] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [availableHours, setAvailableHours] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [clientes, setClientes] = useState([]);

  // 🔹 Carregar serviços
  useEffect(() => {
    fetch("/api/servicos")
      .then(res => res.json())
      .then(setServicos)
      .catch(err => console.error("Erro ao carregar serviços", err));
  }, []);

  // 🔹 Carregar profissionais
  useEffect(() => {
    fetch("/api/profissionais")
      .then(res => res.json())
      .then(setProfissionais)
      .catch(err => console.error("Erro ao carregar profissionais", err));
  }, []);

  // 🔹 Carregar clientes
  useEffect(() => {
    fetch("/api/clientes")
      .then(res => res.json())
      .then(setClientes)
      .catch(err => console.error("Erro ao carregar clientes", err));
  }, []);

  // 🔹 Carregar eventos
  useEffect(() => {
    fetch("/api/calendar/list")
      .then(res => res.json())
      .then(setEvents)
      .catch(err => console.error("Erro ao carregar eventos", err));
  }, []);

  // 🔹 Selecionar cliente
  const handleClienteChange = (id) => {
    setCliente(id);
    const c = clientes.find(c => c.id == id);
    if (c) {
      setNome(c.nome);
      setTelefone(c.telefone.toString()); // força pra string
    }
  };

  // 🔹 Ao clicar numa data
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

  // 🔹 Confirmar reserva
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
        body: JSON.stringify({ 
          cliente, // id do cliente
          nome, 
          telefone: fone, 
          start, 
          servico, 
          obs, 
          profissional
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || "✅ Reserva feita!");
        const novaLista = await fetch("/api/calendar/list");
        setEvents(await novaLista.json());
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

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📅 Agendamento de Serviço</h1>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        timeZone="local"
      />

      {/* Modal */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <Dialog.Title className="text-lg font-bold mb-4">Novo Agendamento</Dialog.Title>

            <p className="text-sm text-gray-500 mb-4">
              Data selecionada: <b>{selectedDate && selectedDate.split("-").reverse().join("/")}</b>
            </p>

            {/* Seleção do cliente */}
            <select
              value={cliente}
              onChange={(e) => handleClienteChange(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              required
            >
              <option value="">Selecione o cliente</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nome} - {c.telefone}
                </option>
              ))}
            </select>

            {/* Nome e telefone aparecem preenchidos */}
            <input
              type="text"
              placeholder="Nome do Cliente"
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

            {/* Profissional */}
            <select
              value={profissional}
              onChange={(e) => setProfissional(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              required
            >
              <option value="">Selecione o profissional</option>
              {profissionais.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} {p.especialidade && `- ${p.especialidade}`}
                </option>
              ))}
            </select>

            {/* Serviço */}
            <select
              value={servico}
              onChange={(e) => setServico(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              required
            >
              <option value="">Selecione o serviço</option>
              {servicos.map(s => (
                <option key={s.id} value={s.nome}>{s.nome}</option>
              ))}
            </select>

            {/* Horário */}
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              required
            >
              <option value="">Selecione o horário</option>
              {availableHours.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
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