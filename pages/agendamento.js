import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction"; // Permite clicar na data
import { Dialog } from "@headlessui/react";

export default function Agendamento() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [servico, setServico] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // 🔹 Buscar eventos já existentes
  useEffect(() => {
    async function fetchEvents() {
      const res = await fetch("/api/calendar/list");
      const data = await res.json();
      setEvents(data);
    }
    fetchEvents();
  }, []);

  // 🔹 Ao clicar numa data → abre modal
const handleDateClick = (info) => {
  // em vez de converter pra Date, pegue direto a string
  // isso garante que o dia clicado é o mesmo mostrado
  setSelectedDate(info.dateStr + "T00:00:00"); 
  setIsOpen(true);
};

  // 🔹 Confirmar reserva
  async function reservarHorario() {
    if (!nome || !telefone || !servico) {
      alert("⚠️ Preencha todos os campos!");
      return;
    }

    const res = await fetch("/api/calendar/reservar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone, start: selectedDate, servico }),
    });

    const data = await res.json();
    alert(data.message || "✅ Reserva feita!");

    // atualizar eventos
    const novaLista = await fetch("/api/calendar/list");
    setEvents(await novaLista.json());

    // resetar form
    setIsOpen(false);
    setNome("");
    setTelefone("");
    setServico("");
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📅 Agendamento de Serviço</h1>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        timeZone="local" // 🔹 garante que clique pega data local
      />

      {/* Modal Formulário */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
        {/* Fundo escuro */}
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <Dialog.Title className="text-lg font-bold mb-4">Novo Agendamento</Dialog.Title>

<p className="text-sm text-gray-500 mb-4">
  Data selecionada:{" "}
  <b>{selectedDate && new Date(selectedDate).toLocaleDateString("pt-BR")}</b>
</p>
            <input
              type="text"
              placeholder="Seu Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              required
            />

            <input
              type="tel"
              placeholder="Telefone (com DDD)"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              required
            />

            <select
              value={servico}
              onChange={(e) => setServico(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
              required
            >
              <option value="">Selecione o serviço</option>
              <option value="Consulta">Consulta</option>
              <option value="Suporte Técnico">Suporte Técnico</option>
              <option value="Treinamento">Treinamento</option>
              <option value="Reunião">Reunião</option>
            </select>

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