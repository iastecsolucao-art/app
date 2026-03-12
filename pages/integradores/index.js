import { useEffect, useState } from "react";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

function getBadgeStyle(status) {
  const base = {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    display: "inline-block",
  };

  if (status === "ONLINE") {
    return { ...base, background: "#dcfce7", color: "#166534" };
  }

  if (status === "ATENCAO") {
    return { ...base, background: "#fef3c7", color: "#92400e" };
  }

  return { ...base, background: "#fee2e2", color: "#991b1b" };
}

export default function IntegradoresPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setErro("");

      const res = await fetch("/api/integrador/clientes");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.details || data?.error || "Erro ao carregar painel");
      }

      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      setErro(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Painel de Integradores</h1>
        <button onClick={loadData} style={{ padding: "8px 12px", cursor: "pointer" }}>
          Atualizar
        </button>
      </div>

      {loading && <p>Carregando...</p>}
      {!!erro && <p style={{ color: "red" }}>{erro}</p>}

      {!loading && !erro && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={th}>Cliente</th>
                <th style={th}>Status</th>
                <th style={th}>Versão</th>
                <th style={th}>Hostname</th>
                <th style={th}>Último heartbeat</th>
                <th style={th}>NF-es</th>
                <th style={th}>Compras</th>
                <th style={th}>Tempo ciclo</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.cliente_codigo} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={td}>{row.cliente_codigo}</td>
                  <td style={td}>
                    <span style={getBadgeStyle(row.status_painel)}>
                      {row.status_painel}
                    </span>
                  </td>
                  <td style={td}>{row.versao_integrador || "-"}</td>
                  <td style={td}>{row.hostname || "-"}</td>
                  <td style={td}>{formatDate(row.ultimo_heartbeat)}</td>
                  <td style={td}>{row.nfe_processadas ?? 0}</td>
                  <td style={td}>{row.compras_processadas ?? 0}</td>
                  <td style={td}>{row.tempo_ciclo_ms ? `${row.tempo_ciclo_ms} ms` : "-"}</td>
                  <td style={td}>
                    <a href={`/integradores/${encodeURIComponent(row.cliente_codigo)}`}>
                      Ver detalhes
                    </a>
                  </td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td colSpan={9} style={{ padding: 16, textAlign: "center" }}>
                    Nenhum integrador encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: 12,
  fontSize: 14,
  borderBottom: "1px solid #d1d5db",
};

const td = {
  textAlign: "left",
  padding: 12,
  fontSize: 14,
};