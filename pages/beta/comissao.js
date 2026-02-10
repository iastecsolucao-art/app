import React, { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import * as XLSX from "xlsx";

/**
 * Relatório de Vendas por Vendedor - Mensal com Comissão
 * Endpoints esperados:
 *   - /api/lojas
 *   - /api/vendedores
 *   - /api/semanas_calendario?ano=&mes=
 *   - /api/beta/comissao   -> { data, resumo_semanal, subtotais_loja, total_geral }
 *   - /api/calendario_loja                      -> [{ loja, semana, abaixo, cota, super_cota, cota_ouro, ... }, ...]
 */
export default function RelatorioVendasVendedorMensalComissao() {
  const [loading, setLoading] = useState(false);

  // dados retornados pelo back
  const [data, setData] = useState([]);               // linhas por vendedor
  const [resumo, setResumo] = useState({});           // mapa loja -> semana -> meta
  const [subtotais, setSubtotais] = useState({});     // mapa loja -> { meta, real, comissao, pct }
  const [totalGeral, setTotalGeral] = useState(null); // { meta_total, real_total, comissao_total, pct_meta }
  const [semanasApi, setSemanasApi] = useState([]);   // semanas vindas do back

  // percentuais do calendario_loja
  const [percentuais, setPercentuais] = useState({});

  // filtros
  const [anosSelecionados, setAnosSelecionados] = useState([]);
  const [mesesSelecionados, setMesesSelecionados] = useState([]);
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [lojasSelecionadas, setLojasSelecionadas] = useState([]);
  const [vendedoresSelecionados, setVendedoresSelecionados] = useState([]);

  // opções para selects
  const [lojasDisponiveis, setLojasDisponiveis] = useState([]);
  const [vendedoresDisponiveis, setVendedoresDisponiveis] = useState([]);
  const [semanasDisponiveis, setSemanasDisponiveis] = useState([]);
  const [semanasSelecionadas, setSemanasSelecionadas] = useState([]);

  const tableRef = useRef(null);

  // listas fixas de anos/meses/dias
  const anosDisponiveis = Array.from({ length: 30 }, (_, i) => {
    const ano = 2000 + i;
    return { value: ano.toString(), label: ano.toString() };
  });
  const mesesDisponiveis = Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    return { value: mes.toString(), label: mes.toString().padStart(2, "0") };
  });
  const diasDisponiveis = Array.from({ length: 31 }, (_, i) => {
    const dia = i + 1;
    return { value: dia.toString(), label: dia.toString().padStart(2, "0") };
  });

  // utils
  const formatDateBr = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  };
  const getColor = (pct) => (pct >= 100 ? "#2e7d32" : pct >= 80 ? "#ed6c02" : "#d32f2f");
  const getArrow = (pct) =>
    pct > 100 ? (
      <span style={{ color: "#2e7d32", marginLeft: 4 }}>▲</span>
    ) : pct < 100 ? (
      <span style={{ color: "#d32f2f", marginLeft: 4 }}>▼</span>
    ) : (
      <span style={{ color: "#999", marginLeft: 4 }}>▶</span>
    );
  const formatarPercentual = (v) => (isNaN(v) ? "0,00%" : `${Number(v).toFixed(2).replace(".", ",")}%`);

  const agruparPorLoja = (linhas) =>
    linhas.reduce((acc, it) => {
      (acc[it.loja] ||= []).push(it);
      return acc;
    }, {});

  // ===== Semana: value único "ANO-SEMANA" e meta.semana = número (1..53)
  const normalizarSemanasSelecionadas = (selected) => {
    const arr = Array.isArray(selected) ? selected : selected ? [selected] : [];
    const norm = arr
      .map((opt) => {
        const raw = String(opt?.value ?? "");
        // aceita "2025-1" ou "1"
        const parts = raw.includes("-") ? raw.split("-") : [null, raw];
        const weekStr = parts[1] ?? raw;
        const week = parseInt(String(weekStr).match(/\d+/)?.[0] ?? "", 10);
        if (!Number.isFinite(week) || week < 1 || week > 53) return null;

        const isoyear =
          opt?.meta?.isoyear ??
          (raw.includes("-") ? parseInt(parts[0], 10) : null) ??
          (anosSelecionados[0]?.value ? parseInt(anosSelecionados[0].value, 10) : null);

        return {
          ...opt,
          value: isoyear ? `${isoyear}-${week}` : String(week),
          label: opt?.label ?? `S${String(week).padStart(2, "0")}`,
          meta: { ...(opt?.meta || {}), isoyear, semana: week },
        };
      })
      .filter(Boolean);

    setSemanasSelecionadas(norm);
  };

  // filtros iniciais (lojas/vendedores)
  useEffect(() => {
    (async () => {
      try {
        const [resLojas, resVendedores] = await Promise.all([
          fetch("/api/lojas", { cache: "no-store" }),
          fetch("/api/vendedores", { cache: "no-store" }),
        ]);
        const lojas = await resLojas.json();
        const vendedores = await resVendedores.json();
        setLojasDisponiveis(lojas.map((l) => ({ value: l, label: l })));
        setVendedoresDisponiveis(vendedores.map((v) => ({ value: v, label: v })));
      } catch (e) {
        console.error("Erro ao carregar filtros:", e);
      }
    })();
  }, []);

  // ===== semanas disponíveis: RECARREGA quando ano/mês mudar e PASSA querystring para a API
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();

        if (anosSelecionados.length) {
          params.append("ano", anosSelecionados.map((a) => a.value).join(","));
        }
        if (mesesSelecionados.length) {
          params.append("mes", mesesSelecionados.map((m) => m.value).join(","));
        }

        const url = `/api/semanas_calendario${params.toString() ? `?${params.toString()}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();

        const weeks = Array.isArray(json?.weeks) ? json.weeks : Array.isArray(json) ? json : [];

        const opts = weeks.map((s) => {
          const inicio = s.ini || s.inicio || s.dt_inicio_mes;
          const fim = s.fim || s.dt_fim_mes;
          const semana = s.semana_iso ?? s.semana;
          const isoyear = s.isoyear ?? s.ano ?? (anosSelecionados[0]?.value ? Number(anosSelecionados[0].value) : null);

          return {
            value: `${isoyear}-${semana}`, // chave única
            label: `S${String(semana).padStart(2, "0")} ${formatDateBr(inicio)} a ${formatDateBr(fim)}`,
            meta: { isoyear, semana: Number(semana), inicio, fim },
          };
        });

        opts.sort((a, b) => {
          const [ya, wa] = String(a.value).split("-").map(Number);
          const [yb, wb] = String(b.value).split("-").map(Number);
          return ya !== yb ? ya - yb : wa - wb;
        });

        setSemanasDisponiveis(opts);

        // se mudou o ano, limpa semanas que não pertencem ao ano atual (evita seleção "fantasma")
        if (anosSelecionados.length) {
          const anoAtual = Number(anosSelecionados[0].value);
          const filtradas = (semanasSelecionadas || []).filter(
            (s) => Number(String(s.value).split("-")[0]) === anoAtual
          );
          if (filtradas.length !== (semanasSelecionadas || []).length) setSemanasSelecionadas(filtradas);
        }
      } catch (e) {
        console.error("Erro ao carregar semanas:", e);
        setSemanasDisponiveis([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anosSelecionados, mesesSelecionados]);

  // Buscar dados + percentuais do calendario_loja
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (anosSelecionados.length) params.append("ano", anosSelecionados.map((a) => a.value).join(","));
      if (mesesSelecionados.length) params.append("mes", mesesSelecionados.map((m) => m.value).join(","));
      if (diasSelecionados.length) params.append("dia", diasSelecionados.map((d) => d.value).join(","));
      if (lojasSelecionadas.length) params.append("loja", lojasSelecionadas.map((l) => l.value).join(","));
      if (vendedoresSelecionados.length) params.append("vendedor", vendedoresSelecionados.map((v) => v.value).join(","));

      // envia apenas os números (1..53) para o backend (compatível com seu endpoint atual)
      const semanasNums = (semanasSelecionadas || [])
        .map((s) => s?.meta?.semana ?? Number(String(s.value).split("-")[1]))
        .filter((n) => Number.isFinite(n));

      if (semanasNums.length) params.append("semana", semanasNums.join(","));

      const [resRel, resCal] = await Promise.all([
        fetch(`/api/comissao?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/calendario_loja?${params.toString()}`, { cache: "no-store" }),
      ]);
      if (!resRel.ok) throw new Error(`HTTP ${resRel.status}`);

      const json = await resRel.json();
      setData(json.data || []);

      // resumo -> mapa loja->semana->meta
      const resumoSemanal = Array.isArray(json.resumo_semanal) ? json.resumo_semanal : [];
      const resumoMap = resumoSemanal.reduce((acc, r) => {
        const loja = r.loja;
        const semana = Number(r.semana);
        (acc[loja] ||= {})[semana] = Number(r.meta_semana_loja || 0);
        return acc;
      }, {});
      setResumo(resumoMap);

      // subtotais por loja
      const subtArr = Array.isArray(json.subtotais_loja) ? json.subtotais_loja : [];
      const subtMap = subtArr.reduce((acc, r) => {
        acc[r.loja] = {
          meta: Number(r.meta_total_loja || 0),
          real: Number(r.realizado_total_loja || 0),
          comissao: Number(r.comissao_total_loja || 0),
          pct: Number(r.pct_meta_loja || 0),
        };
        return acc;
      }, {});
      setSubtotais(subtMap);

      // semanas vindas do back
      const weeksFromBack = [...new Set(resumoSemanal.map((r) => Number(r.semana)))];
      setSemanasApi(weeksFromBack);

      setTotalGeral(json.total_geral || null);

      // calendario_loja -> percentuais por loja/semana
      let mapaPerc = {};
      if (resCal.ok) {
        try {
          const cal = await resCal.json();
          mapaPerc = (Array.isArray(cal) ? cal : []).reduce((acc, r) => {
            const lj = r.loja;
            const s = Number(r.semana);
            (acc[lj] ||= {});
            acc[lj][s] = {
              abaixo: Number(r.abaixo ?? 3.25),
              cota: Number(r.cota ?? 4.0),
              super_cota: Number(r.super_cota ?? 4.5),
              cota_ouro: Number(r.cota_ouro ?? 5.0),
            };
            return acc;
          }, {});
        } catch (e) {
          console.warn("Falha ao processar calendario_loja, usando defaults.", e);
        }
      }
      setPercentuais(mapaPerc);
    } catch (e) {
      console.error(e);
      alert("Erro ao carregar dados");
    }
    setLoading(false);
  };

  // exportar excel
  const exportarExcel = () => {
    if (!tableRef.current) return;
    const wb = XLSX.utils.table_to_book(tableRef.current, { sheet: "Relatório" });
    const nomeArquivo =
      `relatorio_vendas_` +
      (anosSelecionados.length ? anosSelecionados.map((a) => a.value).join("-") : "todos") +
      "_" +
      (mesesSelecionados.length ? mesesSelecionados.map((m) => m.value).join("-") : "todos") +
      "_" +
      (diasSelecionados.length ? diasSelecionados.map((d) => d.value).join("-") : "todos") +
      "_" +
      (semanasSelecionadas.length
        ? "S" + semanasSelecionadas.map((s) => String(s?.meta?.semana ?? String(s.value).split("-")[1])).join("-S")
        : "todasSemanas") +
      `.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  };

  // semanas para render (ordem crescente)
  const semanasRender = useMemo(() => {
    if (semanasSelecionadas.length)
      return semanasSelecionadas
        .map((s) => Number(s?.meta?.semana ?? String(s.value).split("-")[1]))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);

    if (semanasApi.length) return [...semanasApi].sort((a, b) => a - b);

    const setNum = new Set();
    data.forEach((row) => (row.detalhe_semanal || []).forEach((d) => setNum.add(Number(d.semana))));
    return Array.from(setNum).sort((a, b) => a - b);
  }, [data, semanasSelecionadas, semanasApi]);

  // Helper: obtém faixa e percentual de comissão
  function obterFaixaEPercentual(loja, semanaOuNull, percentualAtingido) {
    const defaults = { abaixo: 3.25, cota: 4.0, super_cota: 4.5, cota_ouro: 5.0 };
    const porLoja = percentuais?.[loja] || {};
    const porSemana = (semanaOuNull != null ? porLoja[Number(semanaOuNull)] : null) || porLoja._padrao || defaults;

    let faixa = "Abaixo";
    let perc = porSemana.abaixo;

    if (percentualAtingido >= 120) {
      faixa = "Cota Ouro";
      perc = porSemana.cota_ouro;
    } else if (percentualAtingido >= 110) {
      faixa = "Super Cota";
      perc = porSemana.super_cota;
    } else if (percentualAtingido >= 100) {
      faixa = "Cota";
      perc = porSemana.cota;
    }
    return { faixa, perc };
  }

  // ===== Tabela =====
  function TabelaSemana() {
    const grupos = agruparPorLoja(data);

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
            <th style={{ padding: 12, textAlign: "right", minWidth: 120 }} rowSpan={2}>
              Total Meta
            </th>
            <th style={{ padding: 12, textAlign: "right", minWidth: 120 }} rowSpan={2}>
              Total Real
            </th>
            <th style={{ padding: 12, textAlign: "right", minWidth: 80 }} rowSpan={2}>
              %M
            </th>
            <th style={{ padding: 12, textAlign: "right", minWidth: 140 }} rowSpan={2}>
              Total Comissão
            </th>
            <th
              style={{ border: "1px solid #ccc", padding: 8, backgroundColor: "#1565c0", textAlign: "center" }}
              colSpan={semanasRender.length * 4}
            >
              Semanas
            </th>
          </tr>
          <tr>
            {semanasRender.map((sem) => (
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
            const subtotalSemana = semanasRender.reduce((acc, s) => {
              acc[s] = { meta: Number(resumo?.[loja]?.[s] || 0), realizado: 0, comissao: 0 };
              return acc;
            }, {});

            const linhasVendedores = itens.map((row) => {
              const detalhePorSemana = {};
              (row.detalhe_semanal || []).forEach((d) => {
                const num = Number(d.semana);
                detalhePorSemana[num] = {
                  meta: Number(d.meta || 0),
                  realizado: Number(d.realizado || 0),
                  comissao: Number(d.comissao || 0),
                };
              });

              semanasRender.forEach((s) => {
                const d = detalhePorSemana[s] || { meta: 0, realizado: 0, comissao: 0 };
                subtotalSemana[s].realizado += d.realizado;
                subtotalSemana[s].comissao += d.comissao;
              });

              const totalMetaV = Number(row.total_meta || 0);
              const totalRealV = Number(row.total_real || 0);
              const totalComisV = Number(row.total_comissao || 0);
              const pctMes = totalMetaV > 0 ? (totalRealV / totalMetaV) * 100 : 0;

              return (
                <tr key={`${row.loja}-${row.seller_name}`} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: 12, textAlign: "left", fontWeight: 600, color: "#333" }}>{row.loja}</td>
                  <td style={{ padding: 12, textAlign: "left", color: "#555" }}>{row.seller_name}</td>

                  <td style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "#d32f2f" }}>
                    {totalMetaV.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "#d32f2f" }}>
                    {totalRealV.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>

                  <td
                    style={{
                      padding: 12,
                      textAlign: "right",
                      fontWeight: 600,
                      color: getColor(pctMes),
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 6,
                    }}
                  >
                    {formatarPercentual(pctMes)}
                    {getArrow(pctMes)}
                  </td>

                  <td
                    style={{
                      padding: 12,
                      textAlign: "right",
                      fontWeight: 600,
                      color: totalRealV >= totalMetaV ? "#2e7d32" : "#d32f2f",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {totalComisV.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#555" }}>
                      {(() => {
                        const semanaRef = semanasRender?.[0] ?? null;
                        const { faixa, perc } = obterFaixaEPercentual(row.loja, semanaRef, pctMes);
                        return `${faixa} ${perc.toFixed(2)}%`;
                      })()}
                    </div>
                  </td>

                  {semanasRender.map((sem) => {
                    const d = detalhePorSemana[sem] || { meta: 0, realizado: 0, comissao: 0 };
                    const pct = d.meta > 0 ? (d.realizado / d.meta) * 100 : 0;
                    const { faixa, perc } = obterFaixaEPercentual(row.loja, sem, pct);

                    return (
                      <React.Fragment key={sem}>
                        <td style={{ border: "1px solid #ccc", padding: 8, color: "#d32f2f" }}>
                          {d.meta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td style={{ border: "1px solid #ccc", padding: 8 }}>
                          {d.realizado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ccc",
                            padding: 8,
                            color: getColor(pct),
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 6,
                          }}
                        >
                          {formatarPercentual(pct)}
                          {getArrow(pct)}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ccc",
                            padding: 8,
                            fontWeight: 600,
                            color: d.realizado >= d.meta ? "#2e7d32" : "#d32f2f",
                          }}
                        >
                          {d.comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          <div style={{ fontSize: 11, fontWeight: 500, color: "#555" }}>
                            {`${faixa} ${perc.toFixed(2)}%`}
                          </div>
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            });

            const st = subtotais[loja] || { meta: 0, real: 0, comissao: 0, pct: 0 };

            return (
              <React.Fragment key={loja}>
                {linhasVendedores}

                <tr style={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                  <td style={{ padding: 12 }} colSpan={2}>
                    Subtotal {loja}
                  </td>

                  <td style={{ padding: 12, textAlign: "right", color: "#d32f2f" }}>
                    {st.meta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>

                  <td style={{ padding: 12, textAlign: "right", color: "#d32f2f" }}>
                    {st.real.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>

                  <td
                    style={{
                      padding: 12,
                      textAlign: "right",
                      color: getColor(st.pct),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 6,
                    }}
                  >
                    {formatarPercentual(st.pct)} {getArrow(st.pct)}
                  </td>

                  <td style={{ padding: 12, textAlign: "right", color: st.real >= st.meta ? "#2e7d32" : "#d32f2f" }}>
                    {st.comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#555" }}>
                      {(() => {
                        const semanaRef = semanasRender?.[0] ?? null;
                        const { faixa, perc } = obterFaixaEPercentual(loja, semanaRef, st.pct);
                        return `${faixa} ${perc.toFixed(2)}%`;
                      })()}
                    </div>
                  </td>

                  {semanasRender.map((sem) => {
                    const s = subtotalSemana[sem];
                    const pct = s.meta > 0 ? (s.realizado / s.meta) * 100 : 0;
                    const { faixa, perc } = obterFaixaEPercentual(loja, sem, pct);

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
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 6,
                            color: getColor(pct),
                          }}
                        >
                          {formatarPercentual(pct)}
                          {getArrow(pct)}
                        </td>
                        <td
                          style={{
                            border: "1px solid #ccc",
                            padding: 8,
                            fontWeight: 600,
                            color: s.realizado >= s.meta ? "#2e7d32" : "#d32f2f",
                          }}
                        >
                          {s.comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          <div style={{ fontSize: 11, fontWeight: 500, color: "#555" }}>
                            {`${faixa} ${perc.toFixed(2)}%`}
                          </div>
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </React.Fragment>
            );
          })}

          {totalGeral && (
            <tr style={{ fontWeight: "bold", backgroundColor: "#e3f2fd" }}>
              <td style={{ padding: 12 }} colSpan={2}>
                Total Geral
              </td>
              <td style={{ padding: 12, textAlign: "right" }}>
                {Number(totalGeral.meta_total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </td>
              <td style={{ padding: 12, textAlign: "right" }}>
                {Number(totalGeral.real_total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </td>
              <td style={{ padding: 12, textAlign: "right", color: getColor(Number(totalGeral.pct_meta || 0)) }}>
                {formatarPercentual(Number(totalGeral.pct_meta || 0))}
              </td>
              <td style={{ padding: 12, textAlign: "right" }}>
                {Number(totalGeral.comissao_total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

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
        <div style={{ minWidth: 120 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Ano</label>
          <Select
            options={anosDisponiveis}
            value={anosSelecionados}
            onChange={setAnosSelecionados}
            isMulti
            placeholder="Selecione ano(s)"
            closeMenuOnSelect={false}
            styles={{ menu: (p) => ({ ...p, zIndex: 9999 }) }}
          />
        </div>

        <div style={{ minWidth: 100 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Mês</label>
          <Select
            options={mesesDisponiveis}
            value={mesesSelecionados}
            onChange={setMesesSelecionados}
            isMulti
            placeholder="Selecione mês(es)"
            closeMenuOnSelect={false}
            styles={{ menu: (p) => ({ ...p, zIndex: 9999 }) }}
          />
        </div>

        <div style={{ minWidth: 100 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Dia</label>
          <Select
            options={diasDisponiveis}
            value={diasSelecionados}
            onChange={setDiasSelecionados}
            isMulti
            placeholder="Selecione dia(s)"
            closeMenuOnSelect={false}
            styles={{ menu: (p) => ({ ...p, zIndex: 9999 }) }}
          />
        </div>

        <div style={{ minWidth: 260 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Semana (Sxx – intervalo)</label>
          <Select
            options={semanasDisponiveis}
            value={semanasSelecionadas}
            onChange={normalizarSemanasSelecionadas}
            isMulti
            placeholder="Ex.: S40 29/09 a 05/10"
            closeMenuOnSelect={false}
            styles={{ menu: (p) => ({ ...p, zIndex: 9999 }) }}
          />
        </div>

        <div style={{ minWidth: 220 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Loja</label>
          <Select
            options={lojasDisponiveis}
            value={lojasSelecionadas}
            onChange={setLojasSelecionadas}
            isMulti
            placeholder="Selecione loja(s)"
            closeMenuOnSelect={false}
            styles={{ menu: (p) => ({ ...p, zIndex: 9999 }) }}
          />
        </div>

        <div style={{ minWidth: 220 }}>
          <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Vendedor</label>
          <Select
            options={vendedoresDisponiveis}
            value={vendedoresSelecionados}
            onChange={setVendedoresSelecionados}
            isMulti
            placeholder="Selecione vendedor(es)"
            closeMenuOnSelect={false}
            styles={{ menu: (p) => ({ ...p, zIndex: 9999 }) }}
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
              fontWeight: 600,
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
              fontWeight: 600,
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
        <div style={{ overflowX: "auto", overflowY: "hidden", whiteSpace: "nowrap", maxWidth: "100vw" }}>
          <TabelaSemana />
        </div>
      )}
    </div>
  );
}
  