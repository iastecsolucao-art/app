import React, { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function RelatorioSemanal() {
  const [dataLoja, setDataLoja] = useState([]);
  const [dataLojaVendedor, setDataLojaVendedor] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterLoja, setFilterLoja] = useState("");
  const [filterVendedor, setFilterVendedor] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (inicio, fim) => {
    setLoading(true);
    try {
      // Passa as datas como query params para a API
      const params = new URLSearchParams();
      if (inicio) params.append("dataInicio", inicio);
      if (fim) params.append("dataFim", fim);

      const res = await fetch(`/api/relatorio_semanal?${params.toString()}`);
      const json = await res.json();
      setDataLoja(json.dataLoja || []);
      setDataLojaVendedor(json.dataLojaVendedor || []);
    } catch (error) {
      alert("Erro ao carregar dados");
    }
    setLoading(false);
  };

  // Função para aplicar filtro de datas e recarregar dados
  const aplicarFiltroData = () => {
    fetchData(dataInicio, dataFim);
  };

  // Lojas para filtro
  const lojas = useMemo(() => {
    const setLojas = new Set();
    dataLoja.forEach((row) => {
      if (row.loja) setLojas.add(row.loja);
    });
    return Array.from(setLojas).sort();
  }, [dataLoja]);

  // Vendedores para filtro, filtrados pela loja selecionada
  const vendedores = useMemo(() => {
    const setVendedores = new Set();
    dataLojaVendedor.forEach((row) => {
      if (row.seller_name && (!filterLoja || row.loja === filterLoja)) {
        setVendedores.add(row.seller_name);
      }
    });
    return Array.from(setVendedores).sort();
  }, [dataLojaVendedor, filterLoja]);

  // Filtra dados por loja e vendedor
  const filteredLoja = useMemo(() => {
    return filterLoja ? dataLoja.filter((row) => row.loja === filterLoja) : dataLoja;
  }, [dataLoja, filterLoja]);

  const filteredLojaVendedor = useMemo(() => {
    return dataLojaVendedor.filter((row) => {
      return (!filterLoja || row.loja === filterLoja) && (!filterVendedor || row.seller_name === filterVendedor);
    });
  }, [dataLojaVendedor, filterLoja, filterVendedor]);

  // Calcula % de cota atingida por semana para cada loja (baseado no realizado e meta)
  const calcularCotasAtingidas = (loja) => {
    const cotas = {};
    for (let i = 1; i <= 6; i++) {
      const meta = Number(loja[`semana${i}`]) || 0;
      const realizado = Number(loja[`real_semana${i}`]) || 0;
      cotas[`cota_atingida_semana${i}`] = meta > 0 ? (realizado / meta) * 100 : 0;
    }
    return cotas;
  };

  // Calcula valor da meta por vendedor para cada semana
  const calcularValorMetaVendedor = (loja, semana) => {
    const meta = Number(loja[`semana${semana}`]) || 0;
    const qtdVendedor = Number(loja.qtd_vendedor) || 1; // evitar divisão por zero
    return qtdVendedor > 0 ? meta / qtdVendedor : 0;
  };

  // Subtotais por loja (somando realizado e comissão)
  const calcularSubtotaisPorLoja = (dados) => {
    const map = {};
    dados.forEach((row) => {
      if (!map[row.loja]) {
        map[row.loja] = {
          real_semana1: 0,
          real_semana2: 0,
          real_semana3: 0,
          real_semana4: 0,
          real_semana5: 0,
          real_semana6: 0,
          comissao_semana1: 0,
          comissao_semana2: 0,
          comissao_semana3: 0,
          comissao_semana4: 0,
          comissao_semana5: 0,
          comissao_semana6: 0,
          qtd_vendedor: row.qtd_vendedor || 0,
          semana1: 0,
          semana2: 0,
          semana3: 0,
          semana4: 0,
          semana5: 0,
          semana6: 0,
        };
      }
      for (let i = 1; i <= 6; i++) {
        map[row.loja][`real_semana${i}`] += Number(row[`real_semana${i}`]) || 0;
        map[row.loja][`comissao_semana${i}`] += Number(row[`comissao_semana${i}`]) || 0;
        map[row.loja][`semana${i}`] += Number(row[`semana${i}`]) || 0;
      }
      map[row.loja].qtd_vendedor = row.qtd_vendedor || map[row.loja].qtd_vendedor;
    });
    return map;
  };

  const subtotaisPorLoja = useMemo(() => calcularSubtotaisPorLoja(filteredLojaVendedor), [filteredLojaVendedor]);

  // Linhas com subtotais inseridos após cada grupo de loja
  const linhasComSubtotais = useMemo(() => {
    const linhas = [];
    let lojaAtual = null;

    filteredLojaVendedor.forEach((row, idx) => {
      if (row.loja !== lojaAtual) {
        lojaAtual = row.loja;
      }
      linhas.push({ ...row, isSubtotal: false });

      const proximaLinha = filteredLojaVendedor[idx + 1];
      if (!proximaLinha || proximaLinha.loja !== lojaAtual) {
        const subtotal = subtotaisPorLoja[lojaAtual];
        if (subtotal) {
          linhas.push({
            loja: lojaAtual,
            seller_name: "(Subtotal)",
            ...subtotal,
            isSubtotal: true,
          });
        }
      }
    });

    return linhas;
  }, [filteredLojaVendedor, subtotaisPorLoja]);

  // Exporta Excel (visão loja+vendedor com subtotais)
  const exportToExcel = () => {
    const wsData = [
      [
        "Loja",
        "Vendedor",
        ...Array.from({ length: 6 }, (_, i) => [
          `Meta Semana ${i + 1}`,
          `Real Semana ${i + 1}`,
          `% Cota Semana ${i + 1}`,
          `Valor Meta Vendedor Semana ${i + 1}`,
        ]).flat(),
      ],
      ...linhasComSubtotais.map((row) => [
        row.loja,
        row.seller_name,
        ...Array.from({ length: 6 }, (_, i) => {
          const meta = row[`semana${i + 1}`] || 0;
          const real = row[`real_semana${i + 1}`] || 0;
          const pct = meta > 0 ? (real / meta) * 100 : 0;
          const valorMetaVendedor = calcularValorMetaVendedor(row, i + 1);
          return [meta, real, pct, valorMetaVendedor];
        }).flat(),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RelatorioLojaVendedor");
    XLSX.writeFile(wb, "relatorio_loja_vendedor.xlsx");
  };

  // Dados para gráfico (comissão total por semana, visão loja)
  const chartData = useMemo(() => {
    const totals = {};
    for (let i = 1; i <= 6; i++) totals[`semana${i}`] = 0;

    filteredLoja.forEach((row) => {
      for (let i = 1; i <= 6; i++) {
        totals[`semana${i}`] += Number(row[`comissao_semana${i}`]) || 0;
      }
    });

    return Array.from({ length: 6 }, (_, i) => ({
      semana: `Semana ${i + 1}`,
      Comissão: totals[`semana${i + 1}`],
    }));
  }, [filteredLoja]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Relatório Semanal</h1>

      <div style={{ marginBottom: 20, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Data Início:{" "}
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </label>

        <label>
          Data Fim:{" "}
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </label>

        <button onClick={aplicarFiltroData}>Aplicar Filtro</button>

        <label>
          Filtrar Loja:{" "}
          <select
            value={filterLoja}
            onChange={(e) => {
              setFilterLoja(e.target.value);
              setFilterVendedor("");
            }}
          >
            <option value="">Todas</option>
            {lojas.map((loja) => (
              <option key={loja} value={loja}>
                {loja}
              </option>
            ))}
          </select>
        </label>

        <label>
          Filtrar Vendedor:{" "}
          <select
            value={filterVendedor}
            onChange={(e) => setFilterVendedor(e.target.value)}
            disabled={!filterLoja}
          >
            <option value="">Todos</option>
            {vendedores.map((vendedor) => (
              <option key={vendedor} value={vendedor}>
                {vendedor}
              </option>
            ))}
          </select>
        </label>

        <button onClick={exportToExcel}>Exportar Excel</button>
      </div>

      <h2>Visão por Loja</h2>
      <div style={{ width: "100%", height: 300, marginBottom: 20 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <XAxis dataKey="semana" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Comissão" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          border="1"
          cellPadding="5"
          cellSpacing="0"
          style={{
            width: "100%",
            fontSize: 12,
            marginBottom: 40,
            minWidth: 1200,
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr>
              <th style={{ minWidth: 100 }}>Loja</th>
              {[1, 2, 3, 4, 5, 6].map((sem) => (
                <th
                  key={`header_semana_${sem}`}
                  colSpan="4"
                  style={{ textAlign: "center", minWidth: 150 }}
                >
                  Semana {sem}
                </th>
              ))}
            </tr>
            <tr>
              <th></th>
              {[1, 2, 3, 4, 5, 6].map((sem) => (
                <React.Fragment key={`subheader_semana_${sem}`}>
                  <th style={{ minWidth: 60 }}>Meta</th>
                  <th style={{ minWidth: 60 }}>Real</th>
                  <th style={{ minWidth: 60 }}>% Cota</th>
                  <th style={{ minWidth: 80 }}>Valor Meta Vendedor</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLoja.map((row, i) => {
              const cotas = calcularCotasAtingidas(row);
              return (
                <tr key={`row_loja_${i}`}>
                  <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.loja}</td>
                  {[1, 2, 3, 4, 5, 6].map((sem) => (
                    <React.Fragment key={`data_semana_${sem}_loja_${i}`}>
                      <td>{Number(row[`semana${sem}`]).toFixed(2)}</td>
                      <td>{Number(row[`real_semana${sem}`] || 0).toFixed(2)}</td>
                      <td>{cotas[`cota_atingida_semana${sem}`].toFixed(2)}%</td>
                      <td>{calcularValorMetaVendedor(row, sem).toFixed(2)}</td>
                    </React.Fragment>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>Visão por Loja e Vendedor</h2>
      <div style={{ overflowX: "auto" }}>
        <table
          border="1"
          cellPadding="5"
          cellSpacing="0"
          style={{
            width: "100%",
            fontSize: 12,
            minWidth: 1400,
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr>
              <th style={{ minWidth: 100 }}>Loja</th>
              <th style={{ minWidth: 120 }}>Vendedor</th>
              {[1, 2, 3, 4, 5, 6].map((sem) => (
                <th
                  key={`header_semana_vendedor_${sem}`}
                  colSpan="4"
                  style={{ textAlign: "center", minWidth: 150 }}
                >
                  Semana {sem}
                </th>
              ))}
            </tr>
            <tr>
              <th></th>
              <th></th>
              {[1, 2, 3, 4, 5, 6].map((sem) => (
                <React.Fragment key={`subheader_semana_vendedor_${sem}`}>
                  <th style={{ minWidth: 60 }}>Meta</th>
                  <th style={{ minWidth: 60 }}>Real</th>
                  <th style={{ minWidth: 60 }}>% Cota</th>
                  <th style={{ minWidth: 80 }}>Valor Meta Vendedor</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhasComSubtotais.map((row, i) => {
              if (row.isSubtotal) {
                const metas = {};
                const realizados = {};
                for (let sem = 1; sem <= 6; sem++) {
                  metas[`semana${sem}`] = filteredLoja.find(l => l.loja === row.loja)?.[`semana${sem}`] || 0;
                  realizados[`semana${sem}`] = row[`real_semana${sem}`] || 0;
                }
                return (
                  <tr key={`subtotal_${row.loja}_${i}`} style={{ fontWeight: "bold", backgroundColor: "#eee" }}>
                    <td>{row.loja} (Subtotal)</td>
                    <td></td>
                    {[1, 2, 3, 4, 5, 6].map((sem) => {
                      const meta = Number(metas[`semana${sem}`]) || 0;
                      const real = Number(realizados[`semana${sem}`]) || 0;
                      const cota = meta > 0 ? (real / meta) * 100 : 0;
                      const qtdVendedor = row.qtd_vendedor || 1;
                      const valorMetaVendedor = qtdVendedor > 0 ? meta / qtdVendedor : 0;
                      return (
                        <React.Fragment key={`subtotal_semana_${sem}_${row.loja}`}>
                          <td>{meta.toFixed(2)}</td>
                          <td>{real.toFixed(2)}</td>
                          <td>{cota.toFixed(2)}%</td>
                          <td>{valorMetaVendedor.toFixed(2)}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              } else {
                const cotas = calcularCotasAtingidas(row);
                return (
                  <tr key={`row_loja_vendedor_${i}`}>
                    <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.loja}</td>
                    <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.seller_name}</td>
                    {[1, 2, 3, 4, 5, 6].map((sem) => (
                      <React.Fragment key={`data_semana_vendedor_${sem}_${i}`}>
                        <td>{Number(row[`semana${sem}`] || 0).toFixed(2)}</td>
                        <td>{Number(row[`real_semana${sem}`] || 0).toFixed(2)}</td>
                        <td>{cotas[`cota_atingida_semana${sem}`].toFixed(2)}%</td>
                        <td>{calcularValorMetaVendedor(row, sem).toFixed(2)}</td>
                      </React.Fragment>
                    ))}
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}