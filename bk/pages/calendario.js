import { useState, useEffect } from "react";

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export default function Calendario() {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [semanas, setSemanas] = useState([]);
  const [datasCadastradas, setDatasCadastradas] = useState([]);
  const [populacaoMsg, setPopulacaoMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const gerarCalendario = async () => {
    setLoading(true);
    // Busca semanas via API
    const res = await fetch(`/api/calendario?ano=${ano}`);
    const data = await res.json();
    setSemanas(data.semanas || []);

    // Busca datas cadastradas
    const res2 = await fetch(`/api/calendario/datas?ano=${ano}`);
    const data2 = await res2.json();
    setDatasCadastradas(data2.datasCadastradas || []);
    setLoading(false);
  };

  const popularCalendario = async () => {
    setLoading(true);
    setPopulacaoMsg("");
    try {
      const res = await fetch("/api/calendario/popular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano }),
      });
      const data = await res.json();
      if (res.ok) {
        setPopulacaoMsg(data.message || "Calendário populado com sucesso!");
        // Atualiza visualização após popular
        await gerarCalendario();
      } else {
        setPopulacaoMsg(data.error || "Erro ao popular calendário.");
      }
    } catch (error) {
      setPopulacaoMsg("Erro na requisição: " + error.message);
    }
    setLoading(false);
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
      <button onClick={gerarCalendario} style={{ marginLeft: 10 }} disabled={loading}>
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
        <p style={{ marginTop: 10, fontWeight: "bold", color: populacaoMsg.includes("Erro") ? "red" : "green" }}>
          {populacaoMsg}
        </p>
      )}

      {loading && <p>Carregando...</p>}

      {semanas.length > 0 && !loading && (
        <div style={{ marginTop: 20 }}>
          {semanas.map(({ semana, segunda, datas }) => (
            <div key={semana} style={{ marginBottom: 10 }}>
              <strong>Semana {semana} (Segunda: {segunda})</strong>:{" "}
              {datas.map((d) => (
                <span
                  key={d}
                  style={{
                    marginRight: 5,
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: isCadastrada(d) ? "lightgreen" : "lightcoral",
                    color: "#000",
                  }}
                  title={isCadastrada(d) ? "Data cadastrada" : "Data não cadastrada"}
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