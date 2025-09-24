import React, { useEffect, useState } from "react";

export default function RelatorioMensalSemana() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/relatorio_mensal_semana");
      const json = await res.json();
      setData(json.data || []);
    } catch (error) {
      alert("Erro ao carregar dados");
    }
    setLoading(false);
  };

  const formatterMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div style={{ padding: 20 }}>
      <h1>Relatório Mensal por Semana</h1>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="5"
            cellSpacing="0"
            style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", minWidth: 1200 }}
          >
            <thead style={{ backgroundColor: "#f0f0f0" }}>
              <tr>
                <th rowSpan={2}>Loja</th>
                <th rowSpan={2}>Meta Mês</th>
                <th rowSpan={2}>Realizado Mês</th>
                {[1, 2, 3, 4, 5, 6].map((sem) => (
                  <th key={sem} colSpan={3} style={{ textAlign: "center" }}>
                    Semana {sem}
                  </th>
                ))}
              </tr>
              <tr>
                {[1, 2, 3, 4, 5, 6].map((sem) => (
                  <React.Fragment key={sem}>
                    <th>Meta</th>
                    <th>Realizado</th>
                    <th>% Atingido</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((loja, i) => (
                <tr key={i}>
                  <td>{loja.loja}</td>
                  <td>{formatterMoeda.format(loja.meta_mes || 0)}</td>
                  <td>{formatterMoeda.format(loja.realizado_mes || 0)}</td>
                  {[1, 2, 3, 4, 5, 6].map((sem) => {
                    const s = loja.semanas[sem];
                    return (
                      <React.Fragment key={sem}>
                        <td>{formatterMoeda.format(s.meta || 0)}</td>
                        <td>{formatterMoeda.format(s.realizado || 0)}</td>
                        <td>{s.pct_atingido.toFixed(2)}%</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}