import { useEffect, useMemo, useState } from "react";

type Pedido = {
  id?: string | number;
  referencia: string;        // external_reference
  descricao?: string;
  total?: number;
  metodo?: "PIX" | "BOLETO" | "CARTAO" | string;
  status?: string;           // pending | approved | rejected ...
  criado_em?: string;        // ISO
};

function brl(v: number) {
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${Number(v).toFixed(2)}`;
  }
}

function StatusBadge({ s }: { s?: string }) {
  const k = String(s || "").toLowerCase();
  const base = "text-xs px-2 py-1 rounded";
  if (k === "approved" || k === "pago" || k === "paid")
    return <span className={`${base} bg-emerald-100 text-emerald-700`}>Pago</span>;
  if (k === "rejected" || k === "cancelled")
    return <span className={`${base} bg-rose-100 text-rose-700`}>Recusado</span>;
  if (k === "pending" || k === "in_process")
    return <span className={`${base} bg-amber-100 text-amber-800`}>Pendente</span>;
  return <span className={`${base} bg-gray-100 text-gray-700`}>{s || "—"}</span>;
}

export default function Pedidos() {
  const [email, setEmail] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [refBusca, setRefBusca] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  // Tenta listar por e-mail (se seu backend expuser /api/orders?email=...)
  async function buscarPorEmail() {
    setMensagem(null);
    if (!email) {
      setMensagem("Informe um e-mail.");
      return;
    }
    try {
      setBuscando(true);
      const r = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
      if (!r.ok) {
        setMensagem("Não foi possível listar pedidos por e-mail (endpoint ausente?).");
        setPedidos([]);
        return;
      }
      const data = await r.json();
      const arr: Pedido[] = Array.isArray(data) ? data : [];
      setPedidos(arr);
      if (!arr.length) setMensagem("Nenhum pedido encontrado para este e-mail.");
    } catch (e) {
      setMensagem("Erro ao buscar pedidos.");
      setPedidos([]);
    } finally {
      setBuscando(false);
    }
  }

  // Consultar status por referência (funciona mesmo sem /api/orders)
  async function consultarStatus(referencia: string) {
    try {
      setMensagem(null);
      // 1) tenta seu marcador (webhook atualiza /api/mp/paid?ref=...)
      let r = await fetch(`/api/mp/paid?ref=${encodeURIComponent(referencia)}`);
      let j: any = null;
      if (r.ok) j = await r.json();

      let status: string | undefined =
        (j?.status && String(j.status)) || undefined;

      // 2) fallback: consulta direto no MP via /api/mp/status?ref=...
      if (!status || status === "pending") {
        r = await fetch(`/api/mp/status?ref=${encodeURIComponent(referencia)}`);
        if (r.ok) {
          j = await r.json();
          if (j?.status) status = String(j.status);
        }
      }

      // Atualiza a linha na tabela, se existir
      setPedidos((old) =>
        old.map((p) =>
          p.referencia === referencia ? { ...p, status } : p
        )
      );

      // Sem tabela (consulta avulsa)
      if (!pedidos.find((p) => p.referencia === referencia)) {
        setPedidos([{ referencia, status }]);
      }
    } catch (e) {
      setMensagem("Erro ao consultar status.");
    }
  }

  // Busca avulsa por referência (campo acima da tabela)
  const onBuscarRef = async () => {
    if (!refBusca) {
      setMensagem("Informe a referência do pedido.");
      return;
    }
    await consultarStatus(refBusca.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">Meus pedidos</h1>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-medium mb-2">Buscar por e-mail</h2>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="email@cliente.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                onClick={buscarPorEmail}
                className="rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
                disabled={buscando}
              >
                {buscando ? "Buscando..." : "Buscar"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Requer um endpoint <code>/api/orders?email=&lt;email&gt;</code> (opcional).
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-medium mb-2">Consultar por referência</h2>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="ex.: emp1-1728675300000"
                value={refBusca}
                onChange={(e) => setRefBusca(e.target.value)}
              />
              <button
                onClick={onBuscarRef}
                className="rounded bg-gray-900 text-white px-4 py-2 hover:bg-black"
              >
                Consultar status
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Usa <code>/api/mp/paid</code> e, como fallback, <code>/api/mp/status</code>.
            </p>
          </div>
        </div>

        {mensagem && (
          <div className="mt-4 bg-amber-50 text-amber-800 px-4 py-2 rounded">
            {mensagem}
          </div>
        )}

        <div className="mt-6 bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-2">Referência</th>
                <th className="text-left px-4 py-2">Descrição</th>
                <th className="text-left px-4 py-2">Total</th>
                <th className="text-left px-4 py-2">Método</th>
                <th className="text-left px-4 py-2">Criado</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                    Nenhum pedido listado. Busque por e-mail ou referência.
                  </td>
                </tr>
              ) : (
                pedidos.map((p, ix) => (
                  <tr key={`${p.referencia}-${ix}`} className="border-t">
                    <td className="px-4 py-2 font-mono">{p.referencia}</td>
                    <td className="px-4 py-2">{p.descricao || "—"}</td>
                    <td className="px-4 py-2">{p.total != null ? brl(Number(p.total)) : "—"}</td>
                    <td className="px-4 py-2">{p.metodo || "—"}</td>
                    <td className="px-4 py-2">{p.criado_em ? new Date(p.criado_em).toLocaleString() : "—"}</td>
                    <td className="px-4 py-2"><StatusBadge s={p.status} /></td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => consultarStatus(p.referencia)}
                        className="text-blue-600 hover:underline"
                      >
                        Atualizar status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
