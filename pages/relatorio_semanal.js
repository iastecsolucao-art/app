import React, { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function RelatorioSemanal() {
  const [dataLoja, setDataLoja] = useState([]);
  const [dataLojaVendedor, setDataLojaVendedor] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterLoja, setFilterLoja] = useState("");
  const [filterVendedor, setFilterVendedor] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/relatorio_semanal");
      const json = await res.json();
      setDataLoja(json.dataLoja || []);
      setDataLojaVendedor(json.dataLojaVendedor || []);
    } catch (error) {
      alert("Erro ao carregar dados");
    }
    setLoading(false);
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

  // Função para calcular subtotais por loja
  const calcularSubtotaisPorLoja = (dados) => {
    const map = {};
    dados.forEach((row) => {
      if (!map[row.loja]) {
        map[row.loja] = {
          real_semana1: 0,
          real_semana2: 0,
          real_semana3: 0,
          real_semana4: 0,
          comissao_semana1: 0,
          comissao_semana2: 0,
          comissao_semana3: 0,
          comissao_semana4: 0,
        };
      }
      map[row.loja].real_semana1 += Number(row.real_semana1) || 0;
      map[row.loja].real_semana2 += Number(row.real_semana2) || 0;
      map[row.loja].real_semana3 += Number(row.real_semana3) || 0;
      map[row.loja].real_semana4 += Number(row.real_semana4) || 0;
      map[row.loja].comissao_semana1 += Number(row.comissao_semana1) || 0;
      map[row.loja].comissao_semana2 += Number(row.comissao_semana2) || 0;
      map[row.loja].comissao_semana3 += Number(row.comissao_semana3) || 0;
      map[row.loja].comissao_semana4 += Number(row.comissao_semana4) || 0;
    });
    return map;
  };

  const subtotaisPorLoja = useMemo(() => calcularSubtotaisPorLoja(filteredLojaVendedor), [filteredLojaVendedor]);

  // Monta linhas com subtotais inseridos após cada grupo de loja
  const linhasComSubtotais = useMemo(() => {
    const linhas = [];
    let lojaAtual = null;

    filteredLojaVendedor.forEach((row, idx) => {
      if (row.loja !== lojaAtual) {
        lojaAtual = row.loja;
      }
      linhas.push({ ...row, isSubtotal: false });

      // Verifica se próxima linha é de outra loja ou fim da lista para inserir subtotal
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
        "Real Semana 1",
        "Comissão Semana 1",
        "Real Semana 2",
        "Comissão Semana 2",
        "Real Semana 3",
        "Comissão Semana 3",
        "Real Semana 4",
        "Comissão Semana 4",
      ],
      ...linhasComSubtotais.map((row) => [
        row.loja,
        row.seller_name,
        row.real_semana1,
        row.comissao_semana1,
        row.real_semana2,
        row.comissao_semana2,
        row.real_semana3,
        row.comissao_semana3,
        row.real_semana4,
        row.comissao_semana4,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RelatorioLojaVendedor");
    XLSX.writeFile(wb, "relatorio_loja_vendedor.xlsx");
  };

  // Dados para gráfico (comissão total por semana, visão loja)
  const chartData = useMemo(() => {
    const totals = { semana1: 0, semana2: 0, semana3: 0, semana4: 0 };
    filteredLoja.forEach((row) => {
      totals.semana1 += Number(row.comissao_semana1) || 0;
      totals.semana2 += Number(row.comissao_semana2) || 0;
      totals.semana3 += Number(row.comissao_semana3) || 0;
      totals.semana4 += Number(row.comissao_semana4) || 0;
    });
    return [
      { semana: "Semana 1", Comissão: totals.semana1 },
      { semana: "Semana 2", Comissão: totals.semana2 },
      { semana: "Semana 3", Comissão: totals.semana3 },
      { semana: "Semana 4", Comissão: totals.semana4 },
    ];
  }, [filteredLoja]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Relatório Semanal</h1>

      <div style={{ marginBottom: 20, display: "flex", gap: 20, alignItems: "center" }}>
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

      <table
        border="1"
        cellPadding="5"
        cellSpacing="0"
        style={{ width: "100%", fontSize: 12, marginBottom: 40 }}
      >
        <thead>
          <tr>
            <th>Loja</th>
            {[1, 2, 3, 4].map((sem) => (
              <th key={`header_semana_${sem}`} colSpan="2" style={{ textAlign: "center" }}>
                Semana {sem}
              </th>
            ))}
          </tr>
          <tr>
            <th></th>
            {[1, 2, 3, 4].map((sem) => (
              <React.Fragment key={`subheader_semana_${sem}`}>
                <th key={`real_${sem}`}>Real</th>
                <th key={`comissao_${sem}`}>Comissão</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredLoja.map((row, i) => (
            <tr key={`row_loja_${i}`}>
              <td>{row.loja}</td>
              {[1, 2, 3, 4].map((sem) => {
                const real = Number(row[`real_semana${sem}`]) || 0;
                const comissao = Number(row[`comissao_semana${sem}`]) || 0;
                return (
                  <React.Fragment key={`data_semana_${sem}_loja_${i}`}>
                    <td>{real.toFixed(2)}</td>
                    <td>{comissao.toFixed(2)}</td>
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Visão por Loja e Vendedor</h2>
      <table
        border="1"
        cellPadding="5"
        cellSpacing="0"
        style={{ width: "100%", fontSize: 12 }}
      >
        <thead>
          <tr>
            <th>Loja</th>
            <th>Vendedor</th>
            {[1, 2, 3, 4].map((sem) => (
              <th key={`header_semana_vendedor_${sem}`} colSpan="2" style={{ textAlign: "center" }}>
                Semana {sem}
              </th>
            ))}
          </tr>
          <tr>
            <th></th>
            <th></th>
            {[1, 2, 3, 4].map((sem) => (
              <React.Fragment key={`subheader_semana_vendedor_${sem}`}>
                <th key={`real_vendedor_${sem}`}>Real</th>
                <th key={`comissao_vendedor_${sem}`}>Comissão</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhasComSubtotais.map((row, i) => {
            if (row.isSubtotal) {
              return (
                <tr
                  key={`subtotal_${row.loja}_${i}`}
                  style={{ fontWeight: "bold", backgroundColor: "#eee" }}
                >
                  <td>{row.loja} (Subtotal)</td>
                  <td></td>
                  {[1, 2, 3, 4].map((sem) => (
                    <React.Fragment key={`subtotal_semana_${sem}_${row.loja}`}>
                      <td>{row[`real_semana${sem}`].toFixed(2)}</td>
                      <td>{row[`comissao_semana${sem}`].toFixed(2)}</td>
                    </React.Fragment>
                  ))}
                </tr>
              );
            } else {
              return (
                <tr key={`row_loja_vendedor_${i}`}>
                  <td>{row.loja}</td>
                  <td>{row.seller_name}</td>
                  {[1, 2, 3, 4].map((sem) => {
                    const real = Number(row[`real_semana${sem}`]) || 0;
                    const comissao = Number(row[`comissao_semana${sem}`]) || 0;
                    return (
                      <React.Fragment key={`data_semana_vendedor_${sem}_${i}`}>
                        <td>{real.toFixed(2)}</td>
                        <td>{comissao.toFixed(2)}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            }
          })}
        </tbody>
      </table>
    </div>
  );
}