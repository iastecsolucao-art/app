import { useState } from "react";

// devolve a segunda-feira da semana da data passada
function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // domingo (0) vira -6, segunda (1) vira 0 etc.
  date.setDate(date.getDate() + diff);
  return date;
}

// calcula segunda e os 7 dias da semana ISO (semana começa na segunda)
function getWeekInfo(ano, semana) {
  // regra ISO: a semana 1 é a que contém o dia 4 de janeiro
  const base = new Date(ano, 0, 4); // 4 de janeiro
  const mondayWeek1 = getMonday(base);

  // segunda da semana desejada = segunda da semana 1 + (semana-1)*7 dias
  const monday = new Date(mondayWeek1);
  monday.setDate(mondayWeek1.getDate() + (semana - 1) * 7);

  const datas = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    // formato YYYY-MM-DD (igual banco normalmente retorna date)
    datas.push(d.toISOString().slice(0, 10));
  }

  return {
    segunda: datas[0],
    datas,
  };
}

export default function Calendario() {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [semanas, setSemanas] = useState([]);
  const [datasCadastradas, setDatasCadastradas] = useState([]);
  const [populacaoMsg, setPopulacaoMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const gerarCalendario = async () => {
    setLoading(true);
    setPopulacaoMsg("");

    try {
      // Faz as duas chamadas em paralelo
      const [resSemanas, resDatas] = await Promise.all([
        fetch(`/api/calendario/calendario_loja?ano=${ano}`),
        fetch(`/api/calendario/calendario_loja/datas?ano=${ano}`),
      ]);

      if (!resSemanas.ok) {
        throw new Error(`Erro HTTP semanas: ${resSemanas.status}`);
      }
      if (!resDatas.ok) {
        throw new Error(`Erro HTTP datas: ${resDatas.status}`);
      }

      const dataSemanas = await resSemanas.json();
      const dataDatas = await resDatas.json();

      // -----------------------
      // 1) Montar lista de semanas
      // -----------------------
      // backend pode retornar:
      // a) { semanas: [...] }
      // b) [ ... ] (result.rows)
      let registros =
        Array.isArray(dataSemanas?.semanas) && dataSemanas.semanas.length
          ? dataSemanas.semanas
          : Array.isArray(dataSemanas)
          ? dataSemanas
          : [];

      // pega só os números de semana e remove duplicados
      const semanasUnicas = Array.from(
        new Set(registros.map((r) => r.semana).filter((s) => s != null))
      ).sort((a, b) => a - b);

      // para cada semana, calcula segunda e os 7 dias
      const semanasFormatadas = semanasUnicas.map((numSemana) => {
        const { segunda, datas } = getWeekInfo(ano, numSemana);
        return { semana: numSemana, segunda, datas };
      });

      setSemanas(semanasFormatadas);

      // -----------------------
      // 2) Datas cadastradas
      // -----------------------
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
        await gerarCalendario(); // recarrega para já mostrar as datas
      } else {
        setPopulacaoMsg(data.error || "Erro ao popular calendário.");
      }
    } catch (error) {
      setPopulacaoMsg("Erro na requisição: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const isCadastrada = (data) => datasCadastradas.includes(data);

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
          disabled={loading}
        />
      </label>

      <button
        onClick={gerarCalendario}
        style={{ marginLeft: 10 }}
        disabled={loading}
      >
        Gerar e Verificar
      </button>

      <button
        onClick={popularCalendario}
        style={{ marginLeft: 10, backgroundColor: "#4caf50", color: "white" }}
        disabled={loading}
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

      {semanas.length > 0 && !loading && (
        <div style={{ marginTop: 20 }}>
          {semanas.map(({ semana, segunda, datas }, idx) => (
            <div key={semana ?? idx} style={{ marginBottom: 10 }}>
              <strong>
                Semana {semana} {segunda && `(Segunda: ${segunda})`}
              </strong>
              :{" "}
              {datas.map((d) => (
                <span
                  key={d}
                  style={{
                    marginRight: 5,
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: isCadastrada(d)
                      ? "lightgreen"
                      : "lightcoral",
                    color: "#000",
                  }}
                  title={
                    isCadastrada(d)
                      ? "Data cadastrada"
                      : "Data não cadastrada"
                  }
                >
                  {d}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
