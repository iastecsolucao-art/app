import React, { useEffect, useState } from "react";

export default function RelatorioMensal() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/relatorio_mensal");
      const json = await res.json();
      setData(json.data || []);
    } catch (error) {
      alert("Erro ao carregar dados");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Relatório Mensal</h1>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="5"
            cellSpacing="0"
            style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", minWidth: 1000 }}
          >
            <thead style={{ backgroundColor: "#f0f0f0" }}>
              <tr>
                <th>Filial</th>
                <th>Meta Mês</th>
                <th>Real Mês</th>
                <th>% Atingido</th>
                <th>Cota Vendedor</th>
                <th>% Comissão Loja</th>
                <th>Qtd Vendedor</th>
                <th>Valor Cota</th>
                <th>Valor Super Cota</th>
                <th>Valor Cota Ouro</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td>{row.filial}</td>
                  <td>{row.meta_mes}</td>
                  <td>{row.real_mes}</td>
                  <td>{row.pct_atingido}</td>
                  <td>{row.cota_vendedor}</td>
                  <td>{row.comissao_loja}</td>
                  <td>{row.qtd_vendedor}</td>
                  <td>{row.valor_cota}</td>
                  <td>{row.valor_super_cota}</td>
                  <td>{row.valor_cota_ouro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}