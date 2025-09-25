import React, { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function RelatorioVendasVendedorMensal() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ano, setAno] = useState("");
  const [mes, setMes] = useState("");

  const fetchData = async () => {
    if (!ano || !mes) {
      alert("Preencha ano e mês antes de carregar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/relatorio_mensal_vendedor?ano=${ano}&mes=${mes}`);
      const json = await res.json();
      setData(json.data || []);
    } catch {
      alert("Erro ao carregar dados");
    }
    setLoading(false);
  };

  const formatterMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const formatterPercent = (value) =>
    `${Number(value).toFixed(2).replace(".", ",")}%`;

  const getColor = (pct) => {
    if (pct >= 100) return "green";
    if (pct >= 80) return "orange";
    return "red";
  };

  const exportToExcel = () => {
    if (data.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }
    const exportData = data.map((row) => ({
      Vendedor: row.seller_name,
      "Meta Cota Mês": row.meta_cota_mes,
      "Realizado Mês": row.realizado_mes,
      "% Atingido Cota": row.pct_atingido_cota_mes,
      "Meta Super Mês": row.meta_super_cota_mes,
      "% Atingido Super": row.pct_atingido_super_mes,
      "Meta Ouro Mês": row.meta_cota_ouro_mes,
      "% Atingido Ouro": row.pct_atingido_ouro_mes,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas Vendedor Mensal");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    saveAs(blob, `vendas_vendedor_mensal_${ano}_${mes}.xlsx`);
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Relatório de Vendas por Vendedor - Mensal</h1>
      <div style={{ marginBottom: 20 }}>
        <label>
          Ano:{" "}
          <input
            type="number"
            min="2000"
            max="2100"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            style={{ width: 80 }}
            placeholder="Ex: 2025"
          />
        </label>
        <label style={{ marginLeft: 10 }}>
          Mês:{" "}
          <input
            type="number"
            min="1"
            max="12"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            style={{ width: 60 }}
            placeholder="Ex: 9"
          />
        </label>
        <button onClick={fetchData} style={{ marginLeft: 10 }}>
          Carregar
        </button>
        <button
          onClick={exportToExcel}
          style={{
            marginLeft: 10,
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          Exportar Excel
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : data.length === 0 ? (
        <p>Preencha os filtros e clique em "Carregar" para ver o relatório.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            textAlign: "right",
          }}
        >
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>
                Vendedor
              </th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Meta Cota Mês</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Realizado Mês</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>% Atingido Cota</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Meta Super Mês</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>% Atingido Super</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Meta Ouro Mês</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>% Atingido Ouro</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.seller_name}>
                <td style={{ border: "1px solid #ccc", padding: 8, textAlign: "left" }}>
                  {row.seller_name}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8, color: "red" }}>
                  {formatterMoeda.format(row.meta_cota_mes)}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>
                  {formatterMoeda.format(row.realizado_mes)}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: 8,
                    color: getColor(row.pct_atingido_cota_mes),
                  }}
                >
                  {formatterPercent(row.pct_atingido_cota_mes)}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8, color: "red" }}>
                  {formatterMoeda.format(row.meta_super_cota_mes)}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: 8,
                    color: getColor(row.pct_atingido_super_mes),
                  }}
                >
                  {formatterPercent(row.pct_atingido_super_mes)}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8, color: "red" }}>
                  {formatterMoeda.format(row.meta_cota_ouro_mes)}
                </td>
                <td
                  style={{
                    border: "1px solid #ccc",
                    padding: 8,
                    color: getColor(row.pct_atingido_ouro_mes),
                  }}
                >
                  {formatterPercent(row.pct_atingido_ouro_mes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}