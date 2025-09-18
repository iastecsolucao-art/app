import { useEffect, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend, LineChart, Line
} from "recharts";

export default function DashboardServico() {
  const [resumo, setResumo] = useState(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(setResumo);
  }, []);

  if (!resumo) return <div className="p-6">Carregando...</div>;

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">📊 Dashboard de Serviços</h1>

      {/* Cards Resumo Faturas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-4 shadow rounded">
          <h2 className="font-semibold">💰 Total Pago</h2>
          <p className="text-2xl text-green-600">R$ {resumo?.faturas?.total_pago || 0}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h2 className="font-semibold">🕒 Em Aberto</h2>
          <p className="text-2xl text-orange-500">R$ {resumo?.faturas?.total_aberto || 0}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h2 className="font-semibold">📈 Total Geral</h2>
          <p className="text-2xl text-blue-500">R$ {resumo?.faturas?.total_geral || 0}</p>
        </div>
      </div>

      {/* Cards Resumo Agendamentos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-4 shadow rounded">
          <h2 className="font-semibold">📅 Pendentes</h2>
          <p className="text-2xl">{resumo?.agendamentos?.pendentes || 0}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h2 className="font-semibold">✅ Faturados</h2>
          <p className="text-2xl">{resumo?.agendamentos?.faturados || 0}</p>
        </div>
        <div className="bg-white p-4 shadow rounded">
          <h2 className="font-semibold">❌ Cancelados</h2>
          <p className="text-2xl">{resumo?.agendamentos?.cancelados || 0}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Faturamento Mensal */}
        <div className="bg-white p-4 shadow rounded">
          <h2 className="font-semibold mb-4">📊 Faturamento Mensal</h2>
          {resumo?.mensal?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={resumo.mensal}>
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#3182CE" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center">Sem dados</p>
          )}
        </div>

        {/* Formas de Pagamento */}
        <div className="bg-white p-4 shadow rounded">
          <h2 className="font-semibold mb-4">💳 Formas de Pagamento</h2>
          {resumo?.pagamentos?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={resumo.pagamentos || []}
                  dataKey="total"
                  nameKey="forma_pagamento"
                  outerRadius={120}
                  fill="#8884d8"
                  label
                >
                  {(resumo?.pagamentos || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center">Sem dados</p>
          )}
        </div>
      </div>

      {/* Faturamento Diário (novo gráfico) */}
      <div className="bg-white p-4 shadow rounded mt-8">
        <h2 className="font-semibold mb-4">📅 Faturamento Diário (últimos 30 dias)</h2>
        {resumo?.diario?.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={resumo.diario}>
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#82ca9d" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center">Sem dados de faturamento</p>
        )}
      </div>
    </div>
  );
}