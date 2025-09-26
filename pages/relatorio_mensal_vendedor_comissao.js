import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import * as XLSX from "xlsx";

export default function RelatorioVendasVendedorMensalComissao() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);

  const [lojasDisponiveis, setLojasDisponiveis] = useState([]);
  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState([]);

  const [lojasSelecionadas, setLojasSelecionadas] = useState([]);
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState([]);

  const tableRef = useRef(null);

  useEffect(() => {
    async function fetchFiltros() {
      try {
        const [resLojas, resVendedores] = await Promise.all([
          fetch("/api/lojas"),
          fetch("/api/vendedores"),
        ]);
        const lojas = await resLojas.json();
        const vendedores = await resVendedores.json();

        setLojasDisponiveis(lojas.map((l) => ({ value: l, label: l })));
        setVendedoresDisponiveis(vendedores.map((v) => ({ value: v, label: v })));
      } catch (error) {
        console.error("Erro ao carregar filtros:", error);
      }
    }
    fetchFiltros();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ano,
        mes,
      });
      if (lojasSelecionadas.length > 0)
        params.append("loja", lojasSelecionadas.map((l) => l.value).join(","));
      if (vendedoresSelecionados.length > 0)
        params.append("vendedor", vendedoresSelecionados.map((v) => v.value).join(","));

      const res = await fetch(`/api/relatorio_mensal_vendedor_comissao?${params.toString()}`);
      const json = await res.json();
      setData(json.data || []);
    } catch {
      alert("Erro ao carregar dados");
    }
    setLoading(false);
  };

  const exportarExcel = () => {
    if (!tableRef.current) return;
    const wb = XLSX.utils.table_to_book(tableRef.current, { sheet: "Relatório" });
    XLSX.writeFile(wb, `relatorio_vendas_${ano}_${mes}.xlsx`);
  };

  const getColor = (pct) => {
    if (pct >= 100) return "#2e7d32";
    if (pct >= 80) return "#ed6c02";
    return "#d32f2f";
  };

  const getArrow = (currentPct) => {
    const meta = 100;
    if (currentPct > meta) {
      return <span style={{ color: "#2e7d32", marginLeft: 4 }}>▲</span>;
    } else if (currentPct < meta) {
      return <span style={{ color: "#d32f2f", marginLeft: 4 }}>▼</span>;
    } else {
      return <span style={{ color: "#999", marginLeft: 4 }}>▶</span>;
    }
  };

  const agruparPorLoja = (data) => {
    const grupos = {};
    data.forEach((item) => {
      if (!grupos[item.loja]) grupos[item.loja] = [];
      grupos[item.loja].push(item);
    });
    return grupos;
  };

  const formatarPercentual = (valor) => {
    if (valor === null || valor === undefined || isNaN(valor)) return "0,00%";
    return valor.toFixed(2).replace(".", ",") + "%";
  };

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        width: "100vw",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <h1 style={{ marginBottom: 24, color: "#1976d2", textAlign: "center" }}>
        Relatório de Vendas por Vendedor - Mensal com Comissão
      </h1>

      <div
        style={{
          marginBottom: 24,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", fontWeight: "600", fontSize: 14 }}>
          Ano
          <input
            type="number"
            min="2000"
            max="2100"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            style={{ width: 100, padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", fontWeight: "600", fontSize: 14 }}>
          Mês
          <input
            type="number"
            min="1"
            max="12"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            style={{ width: 80, padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>

        <div style={{ minWidth: 220 }}>
          <label style={{ fontWeight: "600", fontSize: 14, marginBottom: 4 }}>Loja</label>
          <Select
            options={lojasDisponiveis}
            value={lojasSelecionadas}
            onChange={setLojasSelecionadas}
            isMulti
            placeholder="Selecione loja(s)"
            closeMenuOnSelect={false}
            styles={{ menu: (provided) => ({ ...provided, zIndex: 9999 }) }}
          />
        </div>

        <div style={{ minWidth: 220 }}>
          <label style={{ fontWeight: "600", fontSize: 14, marginBottom: 4 }}>Vendedor</label>
          <Select
            options={vendedoresDisponiveis}
            value={vendedoresSelecionados}
            onChange={setVendedoresSelecionados}
            isMulti
            placeholder="Selecione vendedor(es)"
            closeMenuOnSelect={false}
            styles={{ menu: (provided) => ({ ...provided, zIndex: 9999 }) }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <button
            onClick={fetchData}
            style={{
              padding: "8px 20px",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: "600",
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            Carregar
          </button>

          <button
            onClick={exportarExcel}
            style={{
              padding: "8px 20px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 16, color: "#555", textAlign: "center" }}>Carregando...</p>
      ) : data.length === 0 ? (
        <p style={{ fontSize: 16, color: "#555", textAlign: "center" }}>
          Preencha os filtros e clique em "Carregar" para ver o relatório.
        </p>
      ) : (
        <div
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            whiteSpace: "nowrap",
            maxWidth: "100vw",
          }}
        >
          <TabelaSemana
            data={data}
            getColor={getColor}
            agruparPorLoja={agruparPorLoja}
            formatarPercentual={formatarPercentual}
            getArrow={getArrow}
            tableRef={tableRef}
          />
        </div>
      )}
    </div>
  );
}

function TabelaSemana({ data, getColor, agruparPorLoja, formatarPercentual, getArrow, tableRef }) {
  const grupos = agruparPorLoja(data);

  const semanasSet = new Set();
  data.forEach((item) => {
    (item.detalhe_semanal || []).forEach((d) => {
      const numSemana = parseInt(d.semana.replace(/^S/, ""), 10);
      if (!isNaN(numSemana)) semanasSet.add(numSemana);
    });
  });
  const semanas = Array.from(semanasSet).sort((a, b) => a - b);

  return (
    <table
      ref={tableRef}
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 14,
        textAlign: "right",
        boxShadow: "0 2px 8px rgb(0 0 0 / 0.1)",
        borderRadius: 8,
        overflow: "hidden",
        minWidth: 900,
      }}
    >
      <thead style={{ backgroundColor: "#1976d2", color: "white" }}>
        <tr>
          <th style={{ padding: 12, textAlign: "left" }} rowSpan={2}>
            Loja
          </th>
          <th style={{ padding: 12, textAlign: "left" }} rowSpan={2}>
            Vendedor
          </th>

          <th
            style={{
              padding: 12,
              textAlign: "right",
              minWidth: 120,
            }}
            rowSpan={2}
          >
            Total Meta
          </th>
          <th
            style={{
              padding: 12,
              textAlign: "right",
              minWidth: 120,
            }}
            rowSpan={2}
          >
            Total Real
          </th>
          <th
            style={{
              padding: 12,
              textAlign: "right",
              minWidth: 80,
            }}
            rowSpan={2}
          >
            %M
          </th>
          <th
            style={{
              padding: 12,
              textAlign: "right",
              minWidth: 120,
            }}
            rowSpan={2}
          >
            Total Comissão
          </th>

          <th
            style={{
              border: "1px solid #ccc",
              padding: 8,
              backgroundColor: "#1565c0",
              textAlign: "center",
            }}
            colSpan={semanas.length * 4}
          >
            Semanas
          </th>
        </tr>
        <tr>
          {semanas.map((sem) => (
            <React.Fragment key={sem}>
              <th style={{ border: "1px solid #ccc", padding: 8, color: "#ffebee" }}>Meta S{sem}</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Real S{sem}</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>% S{sem}</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Comissão S{sem}</th>
            </React.Fragment>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(grupos).map(([loja, itens]) => {
          const subtotalSemana = semanas.reduce((acc, s) => {
            acc[s] = { meta: 0, realizado: 0, comissao: 0 };
            return acc;
          }, {});

          let subtotalMeta = 0;
          let subtotalReal = 0;
          let subtotalComissao = 0;

          return (
            <React.Fragment key={loja}>
              {itens.map((row) => {
                const detalhePorSemana = {};
                (row.detalhe_semanal || []).forEach((d) => {
                  const numSemana = parseInt(d.semana.replace(/^S/, ""), 10);
                  if (!isNaN(numSemana)) detalhePorSemana[numSemana] = d;
                });

                semanas.forEach((sem) => {
                  const d = detalhePorSemana[sem] || { meta: 0, realizado: 0, comissao: 0 };
                  subtotalSemana[sem].meta += d.meta ?? 0;
                  subtotalSemana[sem].realizado += d.realizado ?? 0;
                  subtotalSemana[sem].comissao += d.comissao ?? 0;
                });

                let totalMetaVendedor = 0;
                let totalRealVendedor = 0;
                let totalComissaoVendedor = 0;
                semanas.forEach((sem) => {
                  const d = detalhePorSemana[sem] || { meta: 0, realizado: 0, comissao: 0, abaixo_cota: 0 };
                  totalMetaVendedor += d.meta ?? 0;
                  totalRealVendedor += d.realizado ?? 0;

                  // Use comissão já calculada no backend
                  totalComissaoVendedor += d.comissao ?? 0;
                });

                subtotalMeta += totalMetaVendedor;
                subtotalReal += totalRealVendedor;
                subtotalComissao += totalComissaoVendedor;

                const percentualMes = totalMetaVendedor > 0 ? (totalRealVendedor / totalMetaVendedor) * 100 : 0;

                return (
                  <tr key={`${row.seller_name}-${row.loja}`} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: 12, textAlign: "left", fontWeight: "600", color: "#333" }}>{row.loja}</td>
                    <td style={{ padding: 12, textAlign: "left", color: "#555" }}>{row.seller_name}</td>

                    <td style={{ padding: 12, textAlign: "right", fontWeight: "600", color: "#d32f2f" }}>
                      {totalMetaVendedor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: "600", color: "#d32f2f" }}>
                      {totalRealVendedor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>

                    <td
                      style={{
                        padding: 12,
                        textAlign: "right",
                        fontWeight: "600",
                        color: getColor(percentualMes),
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 6,
                      }}
                    >
                      {percentualMes.toFixed(2).replace(".", ",")}%{getArrow(percentualMes)}
                    </td>

                    <td
                      style={{
                        padding: 12,
                        textAlign: "right",
                        fontWeight: "600",
                        color: totalRealVendedor >= totalMetaVendedor ? "#2e7d32" : "#d32f2f",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontWeight: "600" }}>
                          {totalComissaoVendedor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                        <span style={{ fontSize: 12, color: "#555" }}>
                          {totalRealVendedor >= totalMetaVendedor ? (
                            <>
                              {totalRealVendedor / totalMetaVendedor <= 1.2 && <>🥉 Cota</>}
                              {totalRealVendedor / totalMetaVendedor > 1.2 && totalRealVendedor / totalMetaVendedor <= 1.4 && <>🥈 Super Cota</>}
                              {totalRealVendedor / totalMetaVendedor > 1.4 && <>🥇 Cota Ouro</>}
                            </>
                          ) : (
                            <>Abaixo</>
                          )}
                        </span>
                      </div>
                    </td>

                    {semanas.map((sem) => {
                      const d = detalhePorSemana[sem] || { meta: 0, realizado: 0, comissao: 0, cota_vendedor: 0, super_cota: 0, cota_ouro: 0, abaixo_cota: 0 };
                      const pctSemana = d.meta > 0 ? (d.realizado / d.meta) * 100 : 0;

                      const ratio = d.meta > 0 ? d.realizado / d.meta : 0;
                      let tipoCota = "";

                      if (ratio < 1) {
                        tipoCota = "Abaixo";
                      } else if (ratio <= 1.20) {
                        tipoCota = "Cota";
                      } else if (ratio <= 1.40) {
                        tipoCota = "Super Cota";
                      } else {
                        tipoCota = "Cota Ouro";
                      }

                      const comissaoCalculada = d.comissao ?? 0;

                      return (
                        <React.Fragment key={sem}>
                          <td style={{ border: "1px solid #ccc", padding: 8, color: "#d32f2f" }}>
                            {(d.meta ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td style={{ border: "1px solid #ccc", padding: 8 }}>
                            {(d.realizado ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>

                          <td
                            style={{
                              border: "1px solid #ccc",
                              padding: 8,
                              color: getColor(pctSemana),
                              fontWeight: "600",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 6,
                            }}
                          >
                            {formatarPercentual(pctSemana)}
                            {getArrow(pctSemana)}
                          </td>

                          <td
                            style={{
                              border: "1px solid #ccc",
                              padding: 8,
                              fontWeight: "600",
                              whiteSpace: "nowrap",
                              color: d.realizado >= d.meta ? "#2e7d32" : "#d32f2f",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                              <span style={{ fontWeight: "600" }}>
                                {comissaoCalculada.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </span>
                              <span style={{ fontSize: 12, color: "#555" }}>
                                {tipoCota === "Abaixo" ? (
                                  <>Abaixo</>
                                ) : tipoCota === "Cota" ? (
                                  <>🥉 Cota</>
                                ) : tipoCota === "Super Cota" ? (
                                  <>🥈 Super Cota</>
                                ) : (
                                  <>🥇 Cota Ouro</>
                                )}
                              </span>
                            </div>
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
              <tr style={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                <td style={{ padding: 12 }} colSpan={2}>
                  Subtotal {loja}
                </td>

                <td
                  style={{
                    padding: 12,
                    textAlign: "right",
                    fontWeight: "600",
                    color: "#d32f2f",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                >
                  {subtotalMeta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>

                <td
                  style={{
                    padding: 12,
                    textAlign: "right",
                    fontWeight: "600",
                    color: "#d32f2f",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                >
                  {subtotalReal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>

                <td
                  style={{
                    padding: 12,
                    textAlign: "right",
                    fontWeight: "600",
                    color: getColor(subtotalMeta > 0 ? (subtotalReal / subtotalMeta) * 100 : 0),
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 6,
                  }}
                >
                  {subtotalMeta > 0 ? (
                    <>
                      {((subtotalReal / subtotalMeta) * 100).toFixed(2).replace(".", ",")}%
                      {getArrow((subtotalReal / subtotalMeta) * 100, null)}
                      {(subtotalReal / subtotalMeta) * 100 >= 100 && (subtotalReal / subtotalMeta) * 100 <= 120 && <span>🥉</span>}
                      {(subtotalReal / subtotalMeta) * 100 > 120 && (subtotalReal / subtotalMeta) * 100 <= 140 && <span>🥈</span>}
                      {(subtotalReal / subtotalMeta) * 100 > 140 && <span>🥇</span>}
                    </>
                  ) : (
                    "Abaixo"
                  )}
                </td>

                <td
                  style={{
                    padding: 12,
                    textAlign: "right",
                    fontWeight: "600",
                    color: subtotalReal >= subtotalMeta ? "#2e7d32" : "#d32f2f",
                    minWidth: 120,
                    whiteSpace: "nowrap",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontWeight: "600" }}>
                      {subtotalComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <span style={{ fontSize: 12, color: "#555" }}>
                      {subtotalReal >= subtotalMeta ? (
                        <>
                          {subtotalReal / subtotalMeta <= 1.2 && <>🥉 Cota</>}
                          {subtotalReal / subtotalMeta > 1.2 && subtotalReal / subtotalMeta <= 1.4 && <>🥈 Super Cota</>}
                          {subtotalReal / subtotalMeta > 1.4 && <>🥇 Cota Ouro</>}
                        </>
                      ) : (
                        <>Abaixo</>
                      )}
                    </span>
                  </div>
                </td>

                {semanas.map((sem) => {
                  const s = subtotalSemana[sem];
                  const pct = s.meta > 0 ? (s.realizado / s.meta) * 100 : 0;
                  return (
                    <React.Fragment key={sem}>
                      <td style={{ border: "1px solid #ccc", padding: 8, color: "#d32f2f" }}>
                        {s.meta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                      <td style={{ border: "1px solid #ccc", padding: 8 }}>
                        {s.realizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>

                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: 8,
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 6,
                          color: getColor(pct),
                        }}
                      >
                        {formatarPercentual(pct)}
                      </td>

                      <td
                        style={{
                          border: "1px solid #ccc",
                          padding: 8,
                          fontWeight: "600",
                          color: s.realizado >= s.meta ? "#2e7d32" : "#d32f2f",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <span style={{ fontWeight: "600" }}>
                            {s.comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                          <span style={{ fontSize: 12, color: "#555" }}>
                            {s.realizado >= s.meta ? (
                              <>
                                {s.realizado / s.meta <= 1.2 && <>🥉 Cota</>}
                                {s.realizado / s.meta > 1.2 && s.realizado / s.meta <= 1.4 && <>🥈 Super Cota</>}
                                {s.realizado / s.meta > 1.4 && <>🥇 Cota Ouro</>}
                              </>
                            ) : (
                              <>Abaixo</>
                            )}
                          </span>
                        </div>
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}