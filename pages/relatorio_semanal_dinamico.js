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

  const [semanaInicio, setSemanaInicio] = useState("");
  const [semanaFim, setSemanaFim] = useState("");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState("");

  const fetchData = async () => {
    const hasAnoMes = ano && mes;
    const hasSemanas = semanaInicio && semanaFim;

    if (!hasAnoMes && !hasSemanas) {
      alert("Preencha ano e mês ou semana início e semana fim antes de carregar.");
      return;
    }

    setLoading(true);
    try {
      const queryAno = hasAnoMes ? ano : new Date().getFullYear();
      const queryMes = hasAnoMes ? mes : new Date().getMonth() + 1;
      const querySemanaInicio = hasSemanas ? semanaInicio : 1;
      const querySemanaFim = hasSemanas ? semanaFim : 53;

      const res = await fetch(
        `/api/relatorio_semanal_dinamico?ano=${queryAno}&mes=${queryMes}&semanaInicio=${querySemanaInicio}&semanaFim=${querySemanaFim}`
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

  // Função para exportar para Excel
  const exportToExcel = () => {
    if (data.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }

    // Montar array de objetos para exportar
    const exportData = data.map((loja) => {
      const base = {
        Loja: loja.loja,
        "Meta Cota Mês": loja.meta_cota_mes,
        "Realizado Mês": loja.realizado_mes,
        "Meta Super Mês": loja.meta_super_cota_mes,
        "Realizado Super Mês": loja.realizado_mes,
        "% Atingido Super Mês": loja.pct_atingido_super_mes,
        "Meta Ouro Mês": loja.meta_cota_ouro_mes,
        "Realizado Ouro Mês": loja.realizado_mes,
        "% Atingido Ouro Mês": loja.pct_atingido_ouro_mes,
      };

      // Adiciona dados semanais
      semanas.forEach((sem) => {
        const s = loja.semanas[sem] || {};
        base[`Semana ${sem} Meta Cota`] = s.meta_cota || 0;
        base[`Semana ${sem} Realizado Cota`] = s.realizado || 0;
        base[`Semana ${sem} % Atingido Cota`] = s.pct_atingido_cota || 0;
        base[`Semana ${sem} Meta Super`] = s.meta_super_cota || 0;
        base[`Semana ${sem} Realizado Super`] = s.realizado || 0;
        base[`Semana ${sem} % Atingido Super`] = s.pct_atingido_super || 0;
      });

      return base;
    });

    // Cria worksheet e workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");

    // Gera buffer e salva arquivo
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    saveAs(blob, `relatorio_mensal_semana_${ano}_${mes}.xlsx`);
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
        <label>
          Semana Início:{" "}
          <input
            type="number"
            min="1"
            max="53"
            value={semanaInicio}
            onChange={(e) => setSemanaInicio(e.target.value)}
            style={{ width: 60 }}
            placeholder="Ex: 1"
          />
        </label>
        <label>
          Semana Fim:{" "}
          <input
            type="number"
            min="1"
            max="53"
            value={semanaFim}
            onChange={(e) => setSemanaFim(e.target.value)}
            style={{ width: 60 }}
            placeholder="Ex: 6"
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

      {loading ? (
        <p>Carregando...</p>
      ) : data.length === 0 ? (
        <p>Preencha os filtros e clique em "Carregar" para ver o relatório.</p>
      ) : (
        <div style={{ overflowX: "auto", maxWidth: "100%" }}>
          <table
            style={{
              width: "100%",
              fontSize: 12,
              borderCollapse: "collapse",
              minWidth: 1600,
              textAlign: "right",
            }}
          >
            <thead style={{ backgroundColor: "#f0f0f0" }}>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    borderRight: "2px solid #999",
                    padding: "8px 12px",
                    minWidth: 150,
                    whiteSpace: "nowrap",
                  }}
                  rowSpan={2}
                >
                  Loja
                </th>
                {/* Metas e realizados mensais */}
                <th
                  style={{
                    borderRight: "2px solid #999",
                    padding: "8px 12px",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                  rowSpan={2}
                >
                  Meta Cota Mês
                </th>
                <th
                  style={{
                    borderRight: "2px solid #999",
                    padding: "8px 12px",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                  rowSpan={2}
                >
                  Realizado Mês
                </th>
                <th
                  style={{
                    borderRight: "2px solid #999",
                    padding: "8px 12px",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                  rowSpan={2}
                >
                  Meta Super Mês
                </th>
                <th
                  style={{
                    borderRight: "2px solid #999",
                    padding: "8px 12px",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                  rowSpan={2}
                >
                  Realizado Super Mês
                </th>
                <th
                  style={{
                    borderRight: "2px solid #999",
                    padding: "8px 12px",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                  rowSpan={2}
                >
                  % Atingido Super Mês
                </th>
                <th
                  style={{
                    borderRight: "2px solid #999",
                    padding: "8px 12px",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                  rowSpan={2}
                >
                  Meta Ouro Mês
                </th>
                <th
                  style={{
                    borderRight: "2px solid #999",
                    padding: "8px 12px",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                  rowSpan={2}
                >
                  Realizado Ouro Mês
                </th>
                <th
                  style={{
                    borderRight: "2px solid #999",
                    padding: "8px 12px",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                  rowSpan={2}
                >
                  % Atingido Ouro Mês
                </th>
                {/* Cabeçalho semanas */}
                <th
                  colSpan={semanas.length * 6}
                  style={{
                    textAlign: "center",
                    borderLeft: "2px solid #999",
                    borderBottom: "2px solid #999",
                    padding: "8px 12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Semanas
                </th>
              </tr>
              <tr>
                {semanas.map((sem) => (
                  <React.Fragment key={`semana-header-${sem}`}>
                    <th style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                      Meta Cota
                    </th>
                    <th style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                      Realizado
                    </th>
                    <th style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                      % Atingido
                    </th>
                    <th style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                      Meta Super
                    </th>
                    <th style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                      Realizado
                    </th>
                    <th style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                      % Atingido
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((loja, i) => {
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
                    <td
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        whiteSpace: "nowrap",
                        minWidth: 150,
                      }}
                    >
                      {loja.loja}
                    </td>

                    {/* Metas e realizados mensais */}
                    <td
                      style={{
                        padding: "8px 12px",
                        color: getColor(loja.pct_atingido_cota_mes || 0),
                        whiteSpace: "nowrap",
                        minWidth: 120,
                      }}
                    >
                      {formatterMoeda.format(loja.meta_cota_mes || 0)}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        whiteSpace: "nowrap",
                        minWidth: 120,
                      }}
                    >
                      {formatterMoeda.format(loja.realizado_mes || 0)}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        color: getColor(loja.pct_atingido_super_mes || 0),
                        whiteSpace: "nowrap",
                        minWidth: 120,
                      }}
                    >
                      {formatterMoeda.format(loja.meta_super_cota_mes || 0)}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        whiteSpace: "nowrap",
                        minWidth: 120,
                      }}
                    >
                      {formatterMoeda.format(loja.realizado_mes || 0)}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        color: getColor(loja.pct_atingido_super_mes || 0),
                        whiteSpace: "nowrap",
                        minWidth: 120,
                      }}
                    >
                      {formatterPercent(loja.pct_atingido_super_mes || 0)}{" "}
                      {getArrow(loja.pct_atingido_super_mes || 0)}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        color: getColor(loja.pct_atingido_ouro_mes || 0),
                        whiteSpace: "nowrap",
                        minWidth: 120,
                      }}
                    >
                      {formatterMoeda.format(loja.meta_cota_ouro_mes || 0)}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        whiteSpace: "nowrap",
                        minWidth: 120,
                      }}
                    >
                      {formatterMoeda.format(loja.realizado_mes || 0)}
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        color: getColor(loja.pct_atingido_ouro_mes || 0),
                        whiteSpace: "nowrap",
                        minWidth: 120,
                      }}
                    >
                      {formatterPercent(loja.pct_atingido_ouro_mes || 0)}{" "}
                      {getArrow(loja.pct_atingido_ouro_mes || 0)}
                    </td>

                    {/* Semanas */}
                    {semanas.map((sem) => {
                      const s = loja.semanas[sem] || {};
                      return (
                        <React.Fragment key={sem}>
                          <td
                            style={{
                              color: getColor(s.pct_atingido_cota || 0),
                              padding: "6px 10px",
                              whiteSpace: "nowrap",
                              minWidth: 100,
                            }}
                          >
                            {formatterMoeda.format(s.meta_cota || 0)}
                          </td>
                          <td
                            style={{
                              padding: "6px 10px",
                              whiteSpace: "nowrap",
                              minWidth: 100,
                            }}
                          >
                            {formatterMoeda.format(s.realizado || 0)}
                          </td>
                          <td
                            style={{
                              color: getColor(s.pct_atingido_cota || 0),
                              padding: "6px 10px",
                              whiteSpace: "nowrap",
                              minWidth: 100,
                            }}
                          >
                            {formatterPercent(s.pct_atingido_cota || 0)}{" "}
                            {getArrow(s.pct_atingido_cota || 0)}
                          </td>
                          <td
                            style={{
                              color: getColor(s.pct_atingido_super || 0),
                              padding: "6px 10px",
                              whiteSpace: "nowrap",
                              minWidth: 100,
                            }}
                          >
                            {formatterMoeda.format(s.meta_super_cota || 0)}
                          </td>
                          <td
                            style={{
                              padding: "6px 10px",
                              whiteSpace: "nowrap",
                              minWidth: 100,
                            }}
                          >
                            {formatterMoeda.format(s.realizado || 0)}
                          </td>
                          <td
                            style={{
                              color: getColor(s.pct_atingido_super || 0),
                              padding: "6px 10px",
                              whiteSpace: "nowrap",
                              minWidth: 100,
                            }}
                          >
                            {formatterPercent(s.pct_atingido_super || 0)}{" "}
                            {getArrow(s.pct_atingido_super || 0)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}