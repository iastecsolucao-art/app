import { useEffect, useMemo, useState } from "react";

// Segunda-feira da semana da data passada
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date;
}

// Semana ISO: regra ISO -> semana 1 contém 4 de janeiro
function getWeekInfo(ano, semana) {
  const base = new Date(ano, 0, 4);
  const mondayWeek1 = getMonday(base);

  const monday = new Date(mondayWeek1);
  monday.setDate(mondayWeek1.getDate() + (semana - 1) * 7);

  const datas = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    datas.push(d.toISOString().slice(0, 10));
  }

  return { semana, segunda: datas[0], datas, monday };
}

// Gera todas as semanas ISO do ano (52 ou 53)
function gerarSemanasISO(ano) {
  const semanas = [];
  for (let w = 1; w <= 53; w++) {
    const info = getWeekInfo(ano, w);

    const y = info.monday.getFullYear();
    const m = info.monday.getMonth();
    if (y > ano + 1 || (y === ano + 1 && m >= 2)) break;

    semanas.push({ semana: w, segunda: info.segunda, datas: info.datas });
  }
  return semanas;
}

export default function Calendario() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1); // 1..12

  const [datasCadastradas, setDatasCadastradas] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [mutatingDate, setMutatingDate] = useState(null);

  // UI do "Mover"
  const [showMover, setShowMover] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const pad2 = (n) => String(n).padStart(2, "0");
  const ymPrefix = `${ano}-${pad2(mes)}-`;

  const semanas = useMemo(() => gerarSemanasISO(ano), [ano]);
  const datasSet = useMemo(() => new Set(datasCadastradas), [datasCadastradas]);
  const isCadastrada = (d) => datasSet.has(d);

  const carregarDatas = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(
        `/api/calendario/calendario_loja/datas?ano=${ano}&mes=${mes}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Erro HTTP: ${res.status}`);

      const list = Array.isArray(data?.datasCadastradas) ? data.datasCadastradas : [];
      setDatasCadastradas(list);

      // Ajusta "from" se necessário (mantém selecionado se ainda existir)
      if (fromDate && !list.includes(fromDate)) setFromDate("");
    } catch (e) {
      setDatasCadastradas([]);
      setMsg("Erro ao carregar datas: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDatas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mes]);

  const toggleData = async (dataISO) => {
    if (loading || mutatingDate) return;

    const ja = isCadastrada(dataISO);
    setMutatingDate(dataISO);
    setMsg("");

    // otimista
    setDatasCadastradas((prev) => {
      const s = new Set(prev);
      if (ja) s.delete(dataISO);
      else s.add(dataISO);
      return Array.from(s).sort();
    });

    try {
      let res;
      if (!ja) {
        res = await fetch("/api/calendario/calendario_loja/datas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ano, data: dataISO }),
        });
      } else {
        res = await fetch(
          `/api/calendario/calendario_loja/datas?ano=${encodeURIComponent(
            ano
          )}&data=${encodeURIComponent(dataISO)}`,
          { method: "DELETE" }
        );
      }

      const payload = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(payload?.error || payload?.details || `Falha (${res.status})`);

      setMsg(payload?.message || "Alteração salva!");
    } catch (e) {
      // desfaz
      setDatasCadastradas((prev) => {
        const s = new Set(prev);
        if (ja) s.add(dataISO);
        else s.delete(dataISO);
        return Array.from(s).sort();
      });
      setMsg("Erro ao alterar: " + e.message);
    } finally {
      setMutatingDate(null);
    }
  };

  // PATCH para mover cadastro
  const moverData = async () => {
    if (loading || mutatingDate) return;
    if (!fromDate || !toDate) {
      setMsg("Erro: selecione a data de origem e a data de destino.");
      return;
    }
    if (fromDate === toDate) {
      setMsg("Erro: origem e destino não podem ser iguais.");
      return;
    }

    setMutatingDate("MOVE");
    setMsg("");

    try {
      const res = await fetch("/api/calendario/calendario_loja/datas", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano, from: fromDate, to: toDate }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(payload?.error || payload?.details || `Falha (${res.status})`);

      setMsg(payload?.message || `Movido de ${fromDate} para ${toDate}`);
      setShowMover(false);
      setFromDate("");
      setToDate("");

      // recarrega lista do mês atual
      await carregarDatas();
    } catch (e) {
      setMsg("Erro ao mover: " + e.message);
    } finally {
      setMutatingDate(null);
    }
  };

  // Datas do mês atual (para dropdown destino)
  const datasDoMesAtual = useMemo(() => {
    const list = [];
    for (const w of semanas) {
      for (const d of w.datas) {
        if (d.startsWith(ymPrefix)) list.push(d);
      }
    }
    // remove duplicados (só por segurança)
    return Array.from(new Set(list)).sort();
  }, [semanas, ymPrefix]);

  // Filtra semanas para mostrar só as que têm datas do mês escolhido
  const semanasDoMes = useMemo(() => {
    return semanas
      .map((w) => {
        const datasDoMes = w.datas.filter((d) => d.startsWith(ymPrefix));
        if (datasDoMes.length === 0) return null;
        return { ...w, datasDoMes };
      })
      .filter(Boolean);
  }, [semanas, ymPrefix]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Calendário com Datas Cadastradas</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          Ano:{" "}
          <input
            type="number"
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value, 10))}
            min="1900"
            max="2100"
            disabled={loading || !!mutatingDate}
          />
        </label>

        <label>
          Mês:{" "}
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value, 10))}
            disabled={loading || !!mutatingDate}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {pad2(m)}
              </option>
            ))}
          </select>
        </label>

        <button onClick={carregarDatas} disabled={loading || !!mutatingDate}>
          Recarregar
        </button>

        <button
          onClick={() => setShowMover((v) => !v)}
          disabled={loading || !!mutatingDate}
          style={{ marginLeft: 6 }}
        >
          {showMover ? "Fechar mover" : "Mover"}
        </button>
      </div>

      {showMover && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            maxWidth: 520,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label>
              Origem (cadastrada):{" "}
              <select
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={loading || !!mutatingDate}
              >
                <option value="">-- selecione --</option>
                {datasCadastradas
                  .slice()
                  .sort()
                  .map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Destino (mês atual):{" "}
              <select
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                disabled={loading || !!mutatingDate}
              >
                <option value="">-- selecione --</option>
                {datasDoMesAtual.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <button onClick={moverData} disabled={loading || !!mutatingDate}>
              Confirmar mover
            </button>
          </div>

          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: "#444" }}>
            Dica: para “mover 26/01 para semana 6”, escolha como destino uma data da semana 6 (ex.: 2026-02-02).
          </p>
        </div>
      )}

      {msg && (
        <p
          style={{
            marginTop: 10,
            fontWeight: "bold",
            color: msg.includes("Erro") ? "red" : "green",
          }}
        >
          {msg}
        </p>
      )}

      {loading && <p>Carregando...</p>}
      {mutatingDate && mutatingDate !== "MOVE" && <p>Salvando {mutatingDate}...</p>}
      {mutatingDate === "MOVE" && <p>Movendo...</p>}

      {!loading && semanasDoMes.length > 0 && (
        <div style={{ marginTop: 20 }}>
          {semanasDoMes.map(({ semana, segunda, datasDoMes }) => (
            <div key={semana} style={{ marginBottom: 10 }}>
              <strong>
                Semana {semana} {segunda && `(Segunda: ${segunda})`}
              </strong>
              :{" "}
              {datasDoMes.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleData(d)}
                  disabled={!!mutatingDate && mutatingDate !== d}
                  title={isCadastrada(d) ? "Clique para descadastrar" : "Clique para cadastrar"}
                  style={{
                    marginRight: 6,
                    marginBottom: 6,
                    padding: "2px 8px",
                    borderRadius: 6,
                    border: "1px solid #ddd",
                    backgroundColor: isCadastrada(d) ? "lightgreen" : "lightcoral",
                    cursor: !!mutatingDate && mutatingDate !== d ? "not-allowed" : "pointer",
                    opacity: mutatingDate === d ? 0.6 : 1,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {!loading && semanasDoMes.length === 0 && (
        <p style={{ marginTop: 20 }}>
          Nenhuma semana encontrada para {ano}-{pad2(mes)}.
        </p>
      )}
    </div>
  );
}
