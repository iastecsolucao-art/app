import { useMemo, useState } from "react";

// devolve a segunda-feira da semana da data passada
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date;
}

// calcula segunda e os 7 dias da semana ISO (semana começa na segunda)
function getWeekInfo(ano, semana) {
  const base = new Date(ano, 0, 4); // 4 de janeiro
  const mondayWeek1 = getMonday(base);

  const monday = new Date(mondayWeek1);
  monday.setDate(mondayWeek1.getDate() + (semana - 1) * 7);

  const datas = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    datas.push(d.toISOString().slice(0, 10));
  }

  return { segunda: datas[0], datas };
}

export default function Calendario() {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [semanas, setSemanas] = useState([]);
  const [datasCadastradas, setDatasCadastradas] = useState([]);
  const [populacaoMsg, setPopulacaoMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // loading por data (evita travar a tela inteira só porque clicou em 1 data)
  const [mutatingDate, setMutatingDate] = useState(null);

  // lookup rápido
  const datasSet = useMemo(() => new Set(datasCadastradas), [datasCadastradas]);
  const isCadastrada = (data) => datasSet.has(data);

  const gerarCalendario = async () => {
    setLoading(true);
    setPopulacaoMsg("");

    try {
      const [resSemanas, resDatas] = await Promise.all([
        fetch(`/api/calendario/calendario_loja?ano=${ano}`),
        fetch(`/api/calendario/calendario_loja/datas?ano=${ano}`),
      ]);

      if (!resSemanas.ok) throw new Error(`Erro HTTP semanas: ${resSemanas.status}`);
      if (!resDatas.ok) throw new Error(`Erro HTTP datas: ${resDatas.status}`);

      const dataSemanas = await resSemanas.json();
      const dataDatas = await resDatas.json();

      let registros =
        Array.isArray(dataSemanas?.semanas) && dataSemanas.semanas.length
          ? dataSemanas.semanas
          : Array.isArray(dataSemanas)
          ? dataSemanas
          : [];

      const semanasUnicas = Array.from(
        new Set(registros.map((r) => r.semana).filter((s) => s != null))
      ).sort((a, b) => a - b);

      const semanasFormatadas = semanasUnicas.map((numSemana) => {
        const { segunda, datas } = getWeekInfo(ano, numSemana);
        return { semana: numSemana, segunda, datas };
      });

      setSemanas(semanasFormatadas);

      const datasCad = Array.isArray(dataDatas?.datasCadastradas)
        ? dataDatas.datasCadastradas
        : Array.isArray(dataDatas)
        ? dataDatas
        : [];

      setDatasCadastradas(datasCad);
    } catch (err) {
      console.error(err);
      setSemanas([]);
      setDatasCadastradas([]);
      setPopulacaoMsg("Erro ao carregar calendário: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const popularCalendario = async () => {
    setLoading(true);
    setPopulacaoMsg("");

    try {
      const res = await fetch("/api/calendario/calendario_loja/popular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano }),
      });

      const data = await res.json();

      if (res.ok) {
        setPopulacaoMsg(data.message || "Calendário populado com sucesso!");
        await gerarCalendario();
      } else {
        setPopulacaoMsg(data.error || "Erro ao popular calendário.");
      }
    } catch (error) {
      setPopulacaoMsg("Erro na requisição: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ALTERAR (toggle) a data ao clicar
  // Sugestão de contrato:
  // - Se NÃO cadastrada: PUT /api/calendario/calendario_loja/datas  { ano, data }
  // - Se JÁ cadastrada:  DELETE /api/calendario/calendario_loja/datas?ano=YYYY&data=YYYY-MM-DD
  const toggleData = async (data) => {
    if (mutatingDate || loading) return;

    const jaCadastrada = isCadastrada(data);
    setMutatingDate(data);
    setPopulacaoMsg("");

    // otimista
    setDatasCadastradas((prev) => {
      const s = new Set(prev);
      if (jaCadastrada) s.delete(data);
      else s.add(data);
      return Array.from(s).sort();
    });

    try {
      let res;

      if (!jaCadastrada) {
        res = await fetch("/api/calendario/calendario_loja/datas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ano, data }),
        });
      } else {
        res = await fetch(
          `/api/calendario/calendario_loja/datas?ano=${encodeURIComponent(ano)}&data=${encodeURIComponent(data)}`,
          { method: "DELETE" }
        );
      }

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload?.error || `Falha ao alterar (${res.status})`);
      }

      setPopulacaoMsg(payload?.message || "Alteração salva!");
    } catch (err) {
      console.error(err);

      // desfaz otimista
      setDatasCadastradas((prev) => {
        const s = new Set(prev);
        if (jaCadastrada) s.add(data);
        else s.delete(data);
        return Array.from(s).sort();
      });

      setPopulacaoMsg("Erro ao alterar: " + err.message);
    } finally {
      setMutatingDate(null);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Calendário 454 com Datas Cadastradas</h1>

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

      <button
        onClick={gerarCalendario}
        style={{ marginLeft: 10 }}
        disabled={loading || !!mutatingDate}
      >
        Gerar e Verificar
      </button>

      <button
        onClick={popularCalendario}
        style={{ marginLeft: 10, backgroundColor: "#4caf50", color: "white" }}
        disabled={loading || !!mutatingDate}
      >
        Popular Calendário
      </button>

      {populacaoMsg && (
        <p
          style={{
            marginTop: 10,
            fontWeight: "bold",
            color: populacaoMsg.includes("Erro") ? "red" : "green",
          }}
        >
          {populacaoMsg}
        </p>
      )}

      {loading && <p>Carregando...</p>}
      {mutatingDate && <p>Salvando {mutatingDate}...</p>}

      {semanas.length > 0 && !loading && (
        <div style={{ marginTop: 20 }}>
          {semanas.map(({ semana, segunda, datas }, idx) => (
            <div key={semana ?? idx} style={{ marginBottom: 10 }}>
              <strong>
                Semana {semana} {segunda && `(Segunda: ${segunda})`}
              </strong>
              :{" "}
              {datas.map((d) => {
                const cadas = isCadastrada(d);
                const disabled = mutatingDate === d;

                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleData(d)}
                    disabled={!!mutatingDate && mutatingDate !== d}
                    title={cadas ? "Clique para descadastrar" : "Clique para cadastrar"}
                    style={{
                      cursor: disabled ? "wait" : "pointer",
                      border: "1px solid #ddd",
                      marginRight: 6,
                      padding: "2px 8px",
                      borderRadius: 6,
                      backgroundColor: cadas ? "lightgreen" : "lightcoral",
                      color: "#000",
                      opacity: disabled ? 0.6 : 1,
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
