import React, { useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const arrowUp = "▲";
const arrowRight = "▶";
const arrowDown = "▼";

export default function RelatorioSemanalDinamico() {
  const [data, setData] = useState([]);
  const [semanas, setSemanas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("mensal"); // "mensal" ou "semanal"

  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");

  const fetchData = async () => {
    if (!ano || !mes) {
      alert("Preencha ano e mês antes de carregar.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/relatorio_semanal_dinamico?ano=${ano}&mes=${mes}`
      );
      const json = await res.json();
      setData(json.data || []);
      setSemanas(json.semanas || []);
    } catch (error) {
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

  const getArrow = (pct) => {
    if (pct >= 100) return arrowUp;
    if (pct >= 80) return arrowRight;
    return arrowDown;
  };

  const formatMoedaSafe = (value) => formatterMoeda.format(value ?? 0);
  const formatPercentSafe = (value) => formatterPercent(value ?? 0);

  // Subtotais para aba mensal corrigidos para evitar NaN
  const calcularSubtotaisMensal = () => {
    const totalMetaCota = data.reduce(
      (acc, loja) => acc + Number(loja.meta_cota_mes || 0),
      0
    );
    const totalRealizado = data.reduce(
      (acc, loja) => acc + Number(loja.realizado_mes || 0),
      0
    );
    const totalMetaSuper = data.reduce(
      (acc, loja) => acc + Number(loja.meta_super_cota_mes || 0),
      0
    );
    const totalMetaOuro = data.reduce(
      (acc, loja) => acc + Number(loja.meta_cota_ouro_mes || 0),
      0
    );

    const pctRealizado = totalMetaCota > 0 ? (totalRealizado / totalMetaCota) * 100 : 0;
    const pctAtingidoSuper = totalMetaSuper > 0 ? (totalRealizado / totalMetaSuper) * 100 : 0;
    const pctAtingidoOuro = totalMetaOuro > 0 ? (totalRealizado / totalMetaOuro) * 100 : 0;

    return {
      totalMetaCota,
      totalRealizado,
      pctRealizado,
      totalMetaSuper,
      pctAtingidoSuper,
      totalMetaOuro,
      pctAtingidoOuro,
    };
  };

  // Subtotais para aba semanal corrigidos para evitar NaN
  const calcularSubtotaisSemanal = () => {
    const subtotaisPorSemana = {};
    semanas.forEach((sem) => {
      subtotaisPorSemana[sem] = {
        meta_cota: 0,
        realizado: 0,
        pct_atingido_cota: 0,
        meta_super_cota: 0,
        pct_atingido_super: 0,
        meta_cota_ouro: 0,
        realizado_ouro: 0,
        pct_atingido_ouro: 0,
      };
    });

    data.forEach((loja) => {
      semanas.forEach((sem) => {
        const s = loja.semanas[sem] || {};
        subtotaisPorSemana[sem].meta_cota += Number(s.meta_cota || 0);
        subtotaisPorSemana[sem].realizado += Number(s.realizado || 0);
        subtotaisPorSemana[sem].meta_super_cota += Number(s.meta_super_cota || 0);
        subtotaisPorSemana[sem].meta_cota_ouro += Number(s.meta_cota_ouro || 0);
        subtotaisPorSemana[sem].realizado_ouro += Number(s.realizado_ouro || 0);
      });
    });

    semanas.forEach((sem) => {
      const s = subtotaisPorSemana[sem];
      s.pct_atingido_cota = s.meta_cota > 0 ? (s.realizado / s.meta_cota) * 100 : 0;
      s.pct_atingido_super = s.meta_super_cota > 0 ? (s.realizado / s.meta_super_cota) * 100 : 0;
      s.pct_atingido_ouro = s.meta_cota_ouro > 0 ? (s.realizado_ouro / s.meta_cota_ouro) * 100 : 0;
    });

    return subtotaisPorSemana;
  };

  const subtotaisMensal = calcularSubtotaisMensal();
  const subtotaisSemanal = calcularSubtotaisSemanal();

  const thStyle = {
    border: "1px solid #ccc",
    padding: "8px 12px",
    whiteSpace: "nowrap",
    backgroundColor: "#f0f0f0",
    textAlign: "center",
    minWidth: 120,
  };

  const tdStyle = {
    border: "1px solid #ccc",
    padding: "6px 10px",
    whiteSpace: "nowrap",
    textAlign: "right",
    minWidth: 120,
  };

  const tdLeftStyle = {
    ...tdStyle,
    textAlign: "left",
    minWidth: 150,
  };

  const exportToExcel = () => {
    if (data.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }

    if (activeTab === "mensal") {
      const exportData = data.map((loja) => {
        const pctRealizadoMes =
          loja.meta_cota_mes > 0
            ? (loja.realizado_mes / loja.meta_cota_mes) * 100
            : 0;
        return {
          Loja: loja.loja,
          "Meta Cota Mês": loja.meta_cota_mes,
          "Realizado Mês": loja.realizado_mes,
          "% Realizado Mês": pctRealizadoMes,
          "Meta Super Mês": loja.meta_super_cota_mes,
          "% Atingido Super Mês": loja.pct_atingido_super_mes,
          "Meta Ouro Mês": loja.meta_cota_ouro_mes,
          "% Atingido Ouro Mês": loja.pct_atingido_ouro_mes,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Resumo Mensal");

      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, `relatorio_mensal_${ano}_${mes}.xlsx`);
    } else {
      const exportData = data.map((loja) => {
        const base = {
          Loja: loja.loja,
        };
        semanas.forEach((sem) => {
          const s = loja.semanas[sem] || {};
          base[`Semana ${sem} Meta Cota`] = s.meta_cota || 0;
          base[`Semana ${sem} Realizado`] = s.realizado || 0;
          base[`Semana ${sem} % Atingido Cota`] = s.pct_atingido_cota || 0;
          base[`Semana ${sem} Meta Super`] = s.meta_super_cota || 0;
          base[`Semana ${sem} % Atingido Super`] = s.pct_atingido_super || 0;
          base[`Semana ${sem} Meta Ouro`] = s.meta_cota_ouro || 0;
          base[`Semana ${sem} Realizado Ouro`] = s.realizado_ouro || 0;
          base[`Semana ${sem} % Atingido Ouro`] = s.pct_atingido_ouro || 0;
        });
        return base;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Detalhe Semanal");

      const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, `relatorio_semanal_${ano}_${mes}.xlsx`);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Relatório Mensal por Semana</h1>

      <div
        style={{
          marginBottom: 20,
          display: "flex",
          gap: 15,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
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
        <label>
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
        <button onClick={fetchData} style={{ padding: "6px 12px" }}>
          Carregar
        </button>
        <button
          onClick={exportToExcel}
          style={{
            padding: "6px 12px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Exportar Excel
        </button>
      </div>

      {/* Abas */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => setActiveTab("mensal")}
          style={{
            padding: "8px 16px",
            marginRight: 10,
            backgroundColor: activeTab === "mensal" ? "#1976d2" : "#e0e0e0",
            color: activeTab === "mensal" ? "white" : "black",
            border: "none",
            cursor: "pointer",
          }}
        >
          Resumo Mensal
        </button>
        <button
          onClick={() => setActiveTab("semanal")}
          style={{
            padding: "8px 16px",
            backgroundColor: activeTab === "semanal" ? "#1976d2" : "#e0e0e0",
            color: activeTab === "semanal" ? "white" : "black",
            border: "none",
            cursor: "pointer",
          }}
        >
          Detalhe Semanal
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : data.length === 0 ? (
        <p>Preencha os filtros e clique em "Carregar" para ver o relatório.</p>
      ) : activeTab === "mensal" ? (
        // Aba Resumo Mensal
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
          <table
            style={{
              width: "100%",
              fontSize: 12,
              borderCollapse: "collapse",
              minWidth: 950,
              textAlign: "right",
            }}
          >
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 180, textAlign: "left" }}>
                  Loja
                </th>
                <th style={{ ...thStyle, minWidth: 130 }}>Meta Cota Mês</th>
                <th style={{ ...thStyle, minWidth: 130 }}>Realizado Mês</th>
                <th style={{ ...thStyle, minWidth: 130 }}>% Realizado Mês</th>
                <th style={{ ...thStyle, minWidth: 130 }}>Meta Super Mês</th>
                <th style={{ ...thStyle, minWidth: 130 }}>% Atingido Super Mês</th>
                <th style={{ ...thStyle, minWidth: 130 }}>Meta Ouro Mês</th>
                <th style={{ ...thStyle, minWidth: 130 }}>% Atingido Ouro Mês</th>
              </tr>
            </thead>
            <tbody>
              {data.map((loja) => {
                const pctRealizadoMes =
                  loja.meta_cota_mes > 0
                    ? (loja.realizado_mes / loja.meta_cota_mes) * 100
                    : 0;
                return (
                  <tr key={loja.loja}>
                    <td style={{ ...tdLeftStyle, minWidth: 180 }}>{loja.loja}</td>
                    <td
                      style={{
                        ...tdStyle,
                        minWidth: 130,
                        color: getColor(loja.pct_atingido_cota_mes),
                      }}
                    >
                      {formatMoedaSafe(loja.meta_cota_mes)}
                    </td>
                    <td style={{ ...tdStyle, minWidth: 130 }}>
                      {formatMoedaSafe(loja.realizado_mes)}
                    </td>
                    <td
                      style={{ ...tdStyle, minWidth: 130, color: getColor(pctRealizadoMes) }}
                    >
                      {formatPercentSafe(pctRealizadoMes)} {getArrow(pctRealizadoMes)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        minWidth: 130,
                        color: getColor(loja.pct_atingido_super_mes),
                      }}
                    >
                      {formatMoedaSafe(loja.meta_super_cota_mes)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        minWidth: 130,
                        color: getColor(loja.pct_atingido_super_mes),
                      }}
                    >
                      {formatPercentSafe(loja.pct_atingido_super_mes)}{" "}
                      {getArrow(loja.pct_atingido_super_mes)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        minWidth: 130,
                        color: getColor(loja.pct_atingido_ouro_mes),
                      }}
                    >
                      {formatMoedaSafe(loja.meta_cota_ouro_mes)}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        minWidth: 130,
                        color: getColor(loja.pct_atingido_ouro_mes),
                      }}
                    >
                      {formatPercentSafe(loja.pct_atingido_ouro_mes)}{" "}
                      {getArrow(loja.pct_atingido_ouro_mes)}
                    </td>
                  </tr>
                );
              })}
              {/* Linha de subtotais */}
              <tr style={{ fontWeight: "bold", backgroundColor: "#e8e8e8" }}>
                <td style={{ ...tdLeftStyle, minWidth: 180 }}>Total</td>
                <td style={{ ...tdStyle, minWidth: 130 }}>
                  {formatMoedaSafe(subtotaisMensal.totalMetaCota)}
                </td>
                <td style={{ ...tdStyle, minWidth: 130 }}>
                  {formatMoedaSafe(subtotaisMensal.totalRealizado)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    minWidth: 130,
                    color: getColor(subtotaisMensal.pctRealizado),
                  }}
                >
                  {formatPercentSafe(subtotaisMensal.pctRealizado)}{" "}
                  {getArrow(subtotaisMensal.pctRealizado)}
                </td>
                <td style={{ ...tdStyle, minWidth: 130 }}>
                  {formatMoedaSafe(subtotaisMensal.totalMetaSuper)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    minWidth: 130,
                    color: getColor(subtotaisMensal.pctAtingidoSuper),
                  }}
                >
                  {formatPercentSafe(subtotaisMensal.pctAtingidoSuper)}{" "}
                  {getArrow(subtotaisMensal.pctAtingidoSuper)}
                </td>
                <td style={{ ...tdStyle, minWidth: 130 }}>
                  {formatMoedaSafe(subtotaisMensal.totalMetaOuro)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    minWidth: 130,
                    color: getColor(subtotaisMensal.pctAtingidoOuro),
                  }}
                >
                  {formatPercentSafe(subtotaisMensal.pctAtingidoOuro)}{" "}
                  {getArrow(subtotaisMensal.pctAtingidoOuro)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        // Aba Detalhe Semanal
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
          <table
            style={{
              width: "100%",
              fontSize: 12,
              borderCollapse: "collapse",
              minWidth: 1800,
              textAlign: "right",
            }}
          >
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 150 }} rowSpan={3}>
                  Loja
                </th>
                <th style={thStyle} colSpan={semanas.length * 8}>
                  Semanas
                </th>
              </tr>
              <tr>
                {semanas.map((sem) => (
                  <th key={`semana-header-${sem}`} colSpan={8} style={thStyle}>
                    Semana {sem}
                  </th>
                ))}
              </tr>
              <tr>
                {semanas.map((sem) => (
                  <React.Fragment key={`semana-subheader-${sem}`}>
                    <th style={thStyle}>Meta Cota</th>
                    <th style={thStyle}>Realizado</th>
                    <th style={thStyle}>% Atingido Cota</th>
                    <th style={thStyle}>Meta Super</th>
                    <th style={thStyle}>% Atingido Super</th>
                    <th style={thStyle}>Meta Ouro</th>
                    <th style={thStyle}>Realizado Ouro</th>
                    <th style={thStyle}>% Atingido Ouro</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((loja) => (
                <tr key={loja.loja}>
                  <td style={tdLeftStyle}>{loja.loja}</td>
                  {semanas.map((sem) => {
                    const s = loja.semanas[sem] || {
                      meta_cota: 0,
                      realizado: 0,
                      pct_atingido_cota: 0,
                      meta_super_cota: 0,
                      pct_atingido_super: 0,
                      meta_cota_ouro: 0,
                      realizado_ouro: 0,
                      pct_atingido_ouro: 0,
                    };
                    return (
                      <React.Fragment key={sem}>
                        <td style={{ ...tdStyle, color: getColor(s.pct_atingido_cota) }}>
                          {formatMoedaSafe(s.meta_cota)}
                        </td>
                        <td style={tdStyle}>{formatMoedaSafe(s.realizado)}</td>
                        <td style={{ ...tdStyle, color: getColor(s.pct_atingido_cota) }}>
                          {formatPercentSafe(s.pct_atingido_cota)} {getArrow(s.pct_atingido_cota)}
                        </td>
                        <td style={{ ...tdStyle, color: getColor(s.pct_atingido_super) }}>
                          {formatMoedaSafe(s.meta_super_cota)}
                        </td>
                        <td style={tdStyle}>{formatPercentSafe(s.pct_atingido_super)}</td>
                        <td style={{ ...tdStyle, color: getColor(s.pct_atingido_ouro) }}>
                          {formatMoedaSafe(s.meta_cota_ouro)}
                        </td>
                        <td style={tdStyle}>{formatMoedaSafe(s.realizado_ouro)}</td>
                        <td style={{ ...tdStyle, color: getColor(s.pct_atingido_ouro) }}>
                          {formatPercentSafe(s.pct_atingido_ouro)} {getArrow(s.pct_atingido_ouro)}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              ))}
              {/* Linha de subtotais semanais */}
              <tr style={{ fontWeight: "bold", backgroundColor: "#e8e8e8" }}>
                <td style={tdLeftStyle}>Total</td>
                {semanas.map((sem) => {
                  const s = subtotaisSemanal[sem] || {};
                  return (
                    <React.Fragment key={`subtotal-${sem}`}>
                      <td style={{ ...tdStyle, color: getColor(s.pct_atingido_cota) }}>
                        {formatMoedaSafe(s.meta_cota)}
                      </td>
                      <td style={tdStyle}>{formatMoedaSafe(s.realizado)}</td>
                      <td style={{ ...tdStyle, color: getColor(s.pct_atingido_cota) }}>
                        {formatPercentSafe(s.pct_atingido_cota)} {getArrow(s.pct_atingido_cota)}
                      </td>
                      <td style={{ ...tdStyle, color: getColor(s.pct_atingido_super) }}>
                        {formatMoedaSafe(s.meta_super_cota)}
                      </td>
                      <td style={{ ...tdStyle, color: getColor(s.pct_atingido_super) }}>
                        {formatPercentSafe(s.pct_atingido_super)}
                      </td>
                      <td style={{ ...tdStyle, color: getColor(s.pct_atingido_ouro) }}>
                        {formatMoedaSafe(s.meta_cota_ouro)}
                      </td>
                      <td style={tdStyle}>{formatMoedaSafe(s.realizado_ouro)}</td>
                      <td style={{ ...tdStyle, color: getColor(s.pct_atingido_ouro) }}>
                        {formatPercentSafe(s.pct_atingido_ouro)} {getArrow(s.pct_atingido_ouro)}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}