import { useRouter } from "next/router";
import { useEffect, useState } from "react";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

export default function IntegradorDetalhePage() {
  const router = useRouter();
  const { cliente_codigo } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function loadData() {
    if (!cliente_codigo) return;

    try {
      setLoading(true);
      setErro("");

      const res = await fetch(`/api/integrador/cliente/${encodeURIComponent(cliente_codigo)}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.details || json?.error || "Erro ao carregar detalhe");
      }

      setData(json);
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
  }, [cliente_codigo]);

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <a href="/integradores">← Voltar</a>
      </div>

      <h1>Detalhes do integrador</h1>
      <h2 style={{ marginTop: 0 }}>{cliente_codigo || "-"}</h2>

      {loading && <p>Carregando...</p>}
      {!!erro && <p style={{ color: "red" }}>{erro}</p>}

      {!loading && !erro && data && (
        <>
          <section style={card}>
            <h3>Últimos heartbeats</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Data</th>
                    <th style={th}>Status</th>
                    <th style={th}>Versão</th>
                    <th style={th}>Hostname</th>
                    <th style={th}>NF-es</th>
                    <th style={th}>Compras</th>
                    <th style={th}>Tempo</th>
                    <th style={th}>Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {data.heartbeats?.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={td}>{formatDate(row.created_at)}</td>
                      <td style={td}>{row.status}</td>
                      <td style={td}>{row.versao_integrador || "-"}</td>
                      <td style={td}>{row.hostname || "-"}</td>
                      <td style={td}>{row.nfe_processadas ?? 0}</td>
                      <td style={td}>{row.compras_processadas ?? 0}</td>
                      <td style={td}>{row.tempo_ciclo_ms ? `${row.tempo_ciclo_ms} ms` : "-"}</td>
                      <td style={td}>{row.mensagem || "-"}</td>
                    </tr>
                  ))}

                  {!data.heartbeats?.length && (
                    <tr>
                      <td colSpan={8} style={{ padding: 12 }}>
                        Nenhum heartbeat encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section style={card}>
            <h3>Últimos eventos</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Data</th>
                    <th style={th}>Nível</th>
                    <th style={th}>Tipo</th>
                    <th style={th}>Mensagem</th>
                    <th style={th}>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.eventos?.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={td}>{formatDate(row.created_at)}</td>
                      <td style={td}>{row.nivel}</td>
                      <td style={td}>{row.tipo_evento}</td>
                      <td style={td}>{row.mensagem}</td>
                      <td style={td}>
                        <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                          {row.detalhes || "-"}
                        </pre>
                      </td>
                    </tr>
                  ))}

                  {!data.eventos?.length && (
                    <tr>
                      <td colSpan={5} style={{ padding: 12 }}>
                        Nenhum evento encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 16,
  marginBottom: 20,
};

const th = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #d1d5db",
  background: "#f9fafb",
};

const td = {
  textAlign: "left",
  padding: 10,
  verticalAlign: "top",
};