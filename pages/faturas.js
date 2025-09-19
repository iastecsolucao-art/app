import { useEffect, useState } from "react";

export default function Faturas() {
  const [faturas, setFaturas] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [novo, setNovo] = useState(null); 
  const [itens, setItens] = useState([{ servico_id: "", quantidade: 1, valor: 0 }]);

  useEffect(() => {
    carregar();
    fetch("/api/servicos").then(r => r.json()).then(setServicos);
    fetch("/api/agendamentos/pendentes").then(r => r.json()).then(data => {
      // ✅ garantir que id seja number
      const arrumados = data.map(a => ({ ...a, id: Number(a.id) }));
      setAgendamentos(arrumados);
    });
  }, []);

  const carregar = async () => {
    const res = await fetch("/api/faturas");
    const data = await res.json();
    setFaturas(data || []);
  };

  const salvar = async () => {
    if (!novo?.id) {
      alert("⚠️ Agendamento inválido!");
      return;
    }

    // calcula total
    const total = itens.reduce((sum, it) => sum + (it.quantidade * it.valor), 0);

    const res = await fetch("/api/faturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cliente_id: novo.cliente_id,
        agendamento_id: Number(novo.id),
        itens,
        total
      }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("✅ Fatura criada!");
      setNovo(null);
      setItens([{ servico_id: "", quantidade: 1, valor: 0 }]);
      carregar();
    } else {
      alert("Erro: " + data.error);
    }
  };

  const pagar = async (id) => {
    const forma = window.prompt("Informe a forma de pagamento (Pix, Dinheiro, Cartão, Transferência):");
    if (!forma) return;

    const res = await fetch("/api/faturas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, forma_pagamento: forma }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("💰 Fatura paga com sucesso!");
      carregar();
    } else {
      alert("Erro: " + data.error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🧾 Faturas</h1>

      {/* Buscar agendamentos pendentes */}
      <div className="bg-white p-4 shadow rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">🔍 Buscar Agendamento</h2>
        {agendamentos.length === 0 ? (
          <p className="text-gray-500">Nenhum agendamento pendente</p>
        ) : (
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">Cliente</th>
                <th className="border px-2 py-1">Data</th>
                <th className="border px-2 py-1">Serviço</th>
                <th className="border px-2 py-1">Ação</th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((a) => (
                <tr key={a.id}>
                  <td className="border px-2 py-1">{a.id}</td>
                  <td className="border px-2 py-1">{a.cliente}</td>
                  <td className="border px-2 py-1">{new Date(a.data_inicio).toLocaleString("pt-BR")}</td>
                  <td className="border px-2 py-1">{a.titulo}</td>
                  <td className="border px-2 py-1">
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                      onClick={() => setNovo(a)}
                    >
                      ➕ Gerar Fatura
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form de nova fatura */}
      {novo && (
        <div className="bg-gray-100 p-4 shadow mb-6 rounded">
          <h2 className="text-lg font-bold mb-3">Nova Fatura para {novo.cliente}</h2>

          {itens.map((item, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <select
                value={item.servico_id}
                onChange={(e) => {
                  const val = e.target.value;
                  const serv = servicos.find(s => s.id == val);
                  const novos = [...itens];
                  novos[idx].servico_id = Number(val);
                  novos[idx].valor = serv?.valor || 0;
                  setItens(novos);
                }}
                className="border p-2 flex-1"
              >
                <option value="">Selecione Serviço/Produto</option>
                {servicos.map(s => (
                  <option key={s.id} value={s.id}>{s.nome} (R$ {s.valor})</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={item.quantidade}
                onChange={(e) => {
                  const novos = [...itens];
                  novos[idx].quantidade = parseInt(e.target.value || "1");
                  setItens(novos);
                }}
                className="border p-2 w-20"
              />
              <input
                type="number"
                value={item.valor}
                onChange={(e) => {
                  const novos = [...itens];
                  novos[idx].valor = parseFloat(e.target.value || "0");
                  setItens(novos);
                }}
                className="border p-2 w-28"
              />
            </div>
          ))}

          <button
            onClick={() => setItens([...itens, { servico_id: "", quantidade: 1, valor: 0 }])}
            className="bg-gray-300 px-3 py-1 rounded mr-2"
          >
            + Item
          </button>

          <button onClick={salvar} className="bg-green-600 text-white px-4 py-2 rounded">
            💾 Salvar Fatura
          </button>
        </div>
      )}

      {/* Lista de faturas */}
      <h2 className="font-semibold mt-6 mb-2">📜 Histórico</h2>
      {faturas.length === 0 ? (
        <p className="text-gray-500">Nenhuma fatura</p>
      ) : (
        <table className="min-w-full border text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border px-2 py-1">ID</th>
              <th className="border px-2 py-1">Cliente</th>
              <th className="border px-2 py-1">Data</th>
              <th className="border px-2 py-1">Total</th>
              <th className="border px-2 py-1">Status</th>
              <th className="border px-2 py-1">Pagamento</th>
              <th className="border px-2 py-1">Ação</th>
            </tr>
          </thead>
          <tbody>
            {faturas.map((f) => (
              <tr key={f.id}>
                <td className="border px-2 py-1">{f.id}</td>
                <td className="border px-2 py-1">{f.cliente}</td>
                <td className="border px-2 py-1">{new Date(f.data).toLocaleDateString("pt-BR")}</td>
                <td className="border px-2 py-1">R$ {f.total}</td>
                <td className="border px-2 py-1">{f.status}</td>
                <td className="border px-2 py-1">{f.forma_pagamento || "-"}</td>
                <td className="border px-2 py-1">
                  {f.status === "Aberto" ? (
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded"
                      onClick={() => pagar(f.id)}
                    >
                      💰 Receber
                    </button>
                  ) : (
                    <span className="text-gray-500">✓ Pago</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}