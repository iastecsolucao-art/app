import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";

// Componente customizado para múltipla seleção com checkboxes
function MultiSelectCheckbox({ options, selectedOptions, setSelectedOptions, label }) {
  const allSelected = options.length > 0 && selectedOptions.length === options.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedOptions([]);
    } else {
      setSelectedOptions(options);
    }
  };

  const toggleOption = (option) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter((o) => o !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: 4,
        padding: 8,
        minWidth: 200,
        maxHeight: 180,
        overflowY: "auto",
        fontSize: 14,
        marginBottom: 16,
      }}
    >
      <strong>{label}</strong>
      <div>
        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            style={{ marginRight: 8 }}
          />
          Selecionar tudo
        </label>
      </div>
      {options.map((option) => (
        <div key={option}>
          <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selectedOptions.includes(option)}
              onChange={() => toggleOption(option)}
              style={{ marginRight: 8 }}
            />
            {option}
          </label>
        </div>
      ))}
    </div>
  );
}

export default function RelatorioVendasVendedorMensalComissao() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [lojas, setLojas] = useState([]); // múltiplas lojas selecionadas
  const [vendedores, setVendedores] = useState([]); // múltiplos vendedores selecionados

  const [lojasDisponiveis, setLojasDisponiveis] = useState([]);
  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState([]);

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
        setLojasDisponiveis(lojas);
        setVendedoresDisponiveis(vendedores);
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
      if (lojas.length > 0) params.append("loja", lojas.join(","));
      if (vendedores.length > 0) params.append("vendedor", vendedores.join(","));

      const res = await fetch(`/api/relatorio_mensal_vendedor_comissao?${params.toString()}`);
      const json = await res.json();
      setData(json.data || []);
    } catch {
      alert("Erro ao carregar dados");
    }
    setLoading(false);
  };

  const getColor = (pct) => {
    if (pct >= 100) return "#2e7d32";
    if (pct >= 80) return "#ed6c02";
    return "#d32f2f";
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

  const exportarExcel = () => {
    if (!tableRef.current) return;
    const wb = XLSX.utils.table_to_book(tableRef.current, { sheet: "Relatório" });
    XLSX.writeFile(wb, `relatorio_vendas_${ano}_${mes}.xlsx`);
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

        <MultiSelectCheckbox
          label="Loja"
          options={lojasDisponiveis}
          selectedOptions={lojas}
          setSelectedOptions={setLojas}
        />

        <MultiSelectCheckbox
          label="Vendedor"
          options={vendedoresDisponiveis}
          selectedOptions={vendedores}
          setSelectedOptions={setVendedores}
        />

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
            overflowX: "scroll",
            overflowY: "visible",
            whiteSpace: "nowrap",
            scrollbarWidth: "auto", // Firefox
            msOverflowStyle: "auto", // IE 10+
          }}
        >
          <TabelaSemana
            data={data}
            getColor={getColor}
            agruparPorLoja={agruparPorLoja}
            formatarPercentual={formatarPercentual}
            tableRef={tableRef}
          />
        </div>
      )}
    </div>
  );
}

function TabelaSemana({ data, getColor, agruparPorLoja, formatarPercentual, tableRef }) {
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
          <th style={{ padding: 12, textAlign: "right" }} rowSpan={2}>
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

                const totalComissao = semanas.reduce((acc, sem) => {
                  const d = detalhePorSemana[sem] || { comissao: 0 };
                  return acc + (d.comissao ?? 0);
                }, 0);

                return (
                  <tr key={`${row.seller_name}-${row.loja}`} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: 12, textAlign: "left", fontWeight: "600", color: "#333" }}>{row.loja}</td>
                    <td style={{ padding: 12, textAlign: "left", color: "#555" }}>{row.seller_name}</td>

                    <td style={{ padding: 12, textAlign: "right", fontWeight: "600", color: "#2e7d32" }}>
                      {totalComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>

                    {semanas.map((sem) => {
                      const d = detalhePorSemana[sem] || { meta: 0, realizado: 0, comissao: 0 };
                      const pctSemana = d.meta > 0 ? (d.realizado / d.meta) * 100 : 0;
                      return (
                        <React.Fragment key={sem}>
                          <td style={{ border: "1px solid #ccc", padding: 8, color: "#d32f2f" }}>
                            {(d.meta ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td style={{ border: "1px solid #ccc", padding: 8 }}>
                            {(d.realizado ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td style={{ border: "1px solid #ccc", padding: 8, color: getColor(pctSemana), fontWeight: "600" }}>
                            {formatarPercentual(pctSemana)}
                          </td>
                          <td style={{ border: "1px solid #ccc", padding: 8, fontWeight: "600" }}>
                            {(d.comissao ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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

                <td style={{ padding: 12, textAlign: "right", fontWeight: "600", color: "#2e7d32" }}>
                  {semanas.reduce((acc, sem) => acc + (subtotalSemana[sem].comissao ?? 0), 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
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
                      <td style={{ border: "1px solid #ccc", padding: 8, color: getColor(pct), fontWeight: "600" }}>
                        {formatarPercentual(pct)}
                      </td>
                      <td style={{ border: "1px solid #ccc", padding: 8, fontWeight: "600" }}>
                        {s.comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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