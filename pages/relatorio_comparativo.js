import React, { useEffect, useState } from "react";

export default function RelatorioComparativo() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const res = await fetch("/api/relatorio_comparativo");
      const json = await res.json();
      setData(json.data || []);
    } catch {
      alert("Erro ao carregar dados");
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2>Relatório Comparativo de Vendas e Metas</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table
          border="1"
          cellPadding="6"
          style={{ borderCollapse: "collapse", width: "100%", textAlign: "center" }}
        >
          <thead>
            <tr>
              <th>Filial</th>
              <th>Meta Total</th>
              <th>Venda Total</th>
              <th>% Atingido</th>
              <th>Comissão</th>
              <th>Subcomissão</th>
              {[1, 2, 3, 4, 5, 6].map((sem) => (
                <React.Fragment key={sem}>
                  <th>Meta S{sem}</th>
                  <th>Venda S{sem}</th>
                  <th>% Atingido S{sem}</th>
                  <th>Bônus S{sem}</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const pctTotal = row.atingido ? (row.atingido * 100).toFixed(2) : "0.00";
              return (
                <tr key={row.filial}>
                  <td style={{ fontWeight: "bold" }}>{row.filial}</td>
                  <td>{Number(row.meta_venda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{Number(row.tot_venda).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td>{pctTotal}%</td>
                  <td>{Number(row.comissao).toFixed(2)}</td>
                  <td>{Number(row.subcomissao).toFixed(2)}</td>
                  {[1, 2, 3, 4, 5, 6].map((sem) => {
                    const pctSemana = row[`atg_sem${sem}`] ? (row[`atg_sem${sem}`] * 100).toFixed(2) : "0.00";
                    return (
                      <React.Fragment key={sem}>
                        <td>{Number(row[`meta_sem${sem}`]).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                        <td>{Number(row[`venda_sem${sem}`]).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                        <td>{pctSemana}%</td>
                        <td>{Number(row[`bonus_sem${sem}`]).toFixed(2)}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}