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

    // se a segunda-feira já passou muito do ano seguinte, pode parar
    const y = info.monday.getFullYear();
    const m = info.monday.getMonth();
    if (y > ano + 1 || (y === ano + 1 && m >= 2)) break; // margem de segurança

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

  const pad2 = (n) => String(n).padStart(2, "0");
  const ymPrefix = `${ano}-${pad2(mes)}-`;

  const semanas = useMemo(() => gerarSemanasISO(ano), [ano]);
  const datasSet = useMemo(() => new Set(datasCadastradas), [datasCadastradas]);
  const isCadastrada = (d) => datasSet.has(d);

  const carregarDatas = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/calendario/calendario_loja/datas?ano=${ano}&mes=${mes}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Erro HTTP: ${res.status}`);
      setDatasCadastradas(Array.isArray(data?.datasCadastradas) ? data.datasCadastradas : []);
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
          `/api/calendario/calendario_loja/datas?ano=${encodeURIComponent(ano)}&data=${encodeURIComponent(
            dataISO
          )}`,
          { method: "DELETE" }
        );
      }

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || payload?.details || `Falha (${res.status})`);

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
      </div>

      {msg && (
        <p style={{ marginTop: 10, fontWeight: "bold", color: msg.includes("Erro") ? "red" : "green" }}>
          {msg}
        </p>
      )}

      {loading && <p>Carregando...</p>}
      {mutatingDate && <p>Salvando {mutatingDate}...</p>}

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
        <p style={{ marginTop: 20 }}>Nenhuma semana encontrada para {ano}-{pad2(mes)}.</p>
      )}
    </div>
  );
}
