import { useEffect, useState } from "react";

export default function CompletarAgendamentos() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);

  useEffect(() => {
    fetch("/api/calendar/list").then(res => res.json()).then(data => {
      // traz só os importados do Google (já salvos em DB mas sem cliente ou serviço)
      const pendentes = data.filter(ev => ev.source === "db" && (!ev.cliente_id || !ev.servico));
      setAgendamentos(pendentes);
    });

    fetch("/api/clientes").then(res => res.json()).then(setClientes);
    fetch("/api/profissionais").then(res => res.json()).then(setProfissionais);
    fetch("/api/servicos").then(res => res.json()).then(setServicos);
  }, []);

  async function salvar(a) {
    const res = await fetch("/api/calendar/completar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(a),
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
    } else {
      alert("Erro: " + data.error);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📝 Completar Agendamentos Importados</h1>

      {agendamentos.length > 0 ? (
        <div className="space-y-6">
          {agendamentos.map((a, idx) => (
            <div key={idx} className="p-4 bg-white border rounded shadow">
              <p className="text-gray-700 font-semibold">
                {new Date(a.start).toLocaleString()} - {a.title}
              </p>

              {/* Cliente */}
              <select value={a.cliente_id || ""} onChange={e => {
                const novo = [...agendamentos];
                novo[idx].cliente_id = e.target.value;
                setAgendamentos(novo);
              }} className="w-full border rounded p-2 mt-2">
                <option value="">Selecione Cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>

              {/* Serviço */}
              <select value={a.servico || ""} onChange={e => {
                const novo = [...agendamentos];
                novo[idx].servico = e.target.value;
                setAgendamentos(novo);
              }} className="w-full border rounded p-2 mt-2">
                <option value="">Selecione Serviço</option>
                {servicos.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>

              {/* Profissional */}
              <select value={a.profissional_id || ""} onChange={e => {
                const novo = [...agendamentos];
                novo[idx].profissional_id = e.target.value;
                setAgendamentos(novo);
              }} className="w-full border rounded p-2 mt-2">
                <option value="">Selecione Profissional</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>

              {/* Valor */}
              <input type="number" placeholder="Valor (R$)" value={a.valor || ""} 
                onChange={e => {
                  const novo = [...agendamentos];
                  novo[idx].valor = e.target.value;
                  setAgendamentos(novo);
                }}
                className="w-full border rounded p-2 mt-2"
              />

              {/* Observações */}
              <textarea placeholder="Observações" value={a.obs || ""} 
                onChange={e => {
                  const novo = [...agendamentos];
                  novo[idx].obs = e.target.value;
                  setAgendamentos(novo);
                }}
                className="w-full border rounded p-2 mt-2"
              />

              <button 
                onClick={() => salvar(a)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">🎉 Nenhum agendamento importado pendente de completar.</p>
      )}
    </div>
  );
}