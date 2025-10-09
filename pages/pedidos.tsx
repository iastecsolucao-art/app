import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type Entrega = {
  habilitada?: boolean;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

type Pedido = {
  id?: string | number;
  referencia: string;                 // ex.: emp1-...
  descricao?: string;
  total?: number;
  metodo?: "PIX" | "BOLETO" | "CARTAO" | string;
  status?: string;                    // pending | approved | rejected | ...
  criado_em?: string;                 // ISO
  // opcionais vindos do backend:
  ticket_url?: string | null;         // link (pagamento/2ª via)
  entrega?: Entrega | null;           // endereço salvo
};

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());

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
  if (["approved", "pago", "paid"].includes(k))
    return <span className={`${base} bg-emerald-100 text-emerald-700`}>Pago</span>;
  if (["rejected", "cancelled", "canceled"].includes(k))
    return <span className={`${base} bg-rose-100 text-rose-700`}>Recusado</span>;
  if (["pending", "in_process", "authorized", "processing"].includes(k))
    return <span className={`${base} bg-amber-100 text-amber-800`}>Pendente</span>;
  return <span className={`${base} bg-gray-100 text-gray-700`}>{s || "—"}</span>;
}

export default function Pedidos() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [refBusca, setRefBusca] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);

  // loading localizado por referência (para o botão "Atualizar status")
  const [loadingRef, setLoadingRef] = useState<string | null>(null);

  // modal entrega
  const [openEntrega, setOpenEntrega] = useState<Entrega | null>(null);

  // auto-preenche e busca via ?email= (se vier na URL)
  useEffect(() => {
    if (!router.isReady) return;
    const q = (router.query.email as string) || "";
    if (q) {
      setEmail(q);
      // busca automática se e-mail for válido
      if (isEmail(q)) {
        buscarPorEmail(q);
      }
    }
  }, [router.isReady, router.query.email]);

  async function buscarPorEmail(e?: string) {
    setMensagem(null);
    const mail = (e ?? email).trim().toLowerCase();

    if (!isEmail(mail)) {
      setMensagem("Informe um e-mail válido.");
      return;
    }

    try {
      setBuscando(true);
      const r = await fetch(`/api/orders?email=${encodeURIComponent(mail)}`);
      if (!r.ok) {
        setMensagem(
          "Não foi possível listar pedidos por e-mail (endpoint ausente no backend?)."
        );
        setPedidos([]);
        return;
      }
      const data = await r.json();
      const arr: Pedido[] = Array.isArray(data) ? data : [];
      setPedidos(arr);
      if (!arr.length) setMensagem("Nenhum pedido encontrado para este e-mail.");
    } catch {
      setMensagem("Erro ao buscar pedidos.");
      setPedidos([]);
    } finally {
      setBuscando(false);
    }
  }

  async function consultarStatus(referencia: string) {
    try {
      setMensagem(null);
      setLoadingRef(referencia);

      // 1) tenta o marcador local (webhook)
      let r = await fetch(`/api/mp/paid?ref=${encodeURIComponent(referencia)}`);
      let j: any = null;
      if (r.ok) j = await r.json();

      let status: string | undefined =
        (j?.status && String(j.status)) || undefined;
      let ticket_url: string | undefined = j?.ticket_url || undefined;

      // 2) fallback – consulta direto no MP
      if (!status || status === "pending") {
        r = await fetch(`/api/mp/status?ref=${encodeURIComponent(referencia)}`);
        if (r.ok) {
          j = await r.json();
          if (j?.status) status = String(j.status);
          if (!ticket_url && j?.ticket_url) ticket_url = j.ticket_url;
        }
      }

      // atualiza a linha se existir
      setPedidos((old) =>
        old.map((p) =>
          p.referencia === referencia ? { ...p, status, ticket_url } : p
        )
      );

      // consulta avulsa (sem listagem por e-mail)
      if (!pedidos.find((p) => p.referencia === referencia)) {
        setPedidos([{ referencia, status, ticket_url }]);
      }
    } catch {
      setMensagem("Erro ao consultar status.");
    } finally {
      setLoadingRef(null);
    }
  }

  const onBuscarRef = async () => {
    if (!refBusca.trim()) {
      setMensagem("Informe a referência do pedido.");
      return;
    }
    await consultarStatus(refBusca.trim());
  };

  const copiar = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setMensagem("Referência copiada!");
      setTimeout(() => setMensagem(null), 2000);
    } catch {
      setMensagem("Não foi possível copiar.");
    }
  };

  const temPedidos = pedidos.length > 0;

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
                onClick={() => buscarPorEmail()}
                className="rounded bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
                disabled={buscando || !isEmail(email)}
                title={!isEmail(email) ? "Digite um e-mail válido" : "Buscar pedidos"}
              >
                {buscando ? "Buscando..." : "Buscar"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Requer um endpoint <code>/api/orders?email=&lt;email&gt;</code>.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-medium mb-2">Consultar por referência</h2>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-3 py-2 font-mono"
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
              {!temPedidos ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                    Busque por e-mail ou referência para visualizar seus pedidos.
                  </td>
                </tr>
              ) : (
                pedidos.map((p, ix) => (
                  <tr key={`${p.referencia}-${ix}`} className="border-t">
                    <td className="px-4 py-2 font-mono">{p.referencia}</td>
                    <td className="px-4 py-2">{p.descricao || "—"}</td>
                    <td className="px-4 py-2">
                      {p.total != null ? brl(Number(p.total)) : "—"}
                    </td>
                    <td className="px-4 py-2">{p.metodo || "—"}</td>
                    <td className="px-4 py-2">
                      {p.criado_em ? new Date(p.criado_em).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge s={p.status} />
                    </td>
                    <td className="px-4 py-2 space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => consultarStatus(p.referencia)}
                        className="text-blue-600 hover:underline disabled:opacity-50"
                        disabled={loadingRef === p.referencia}
                        title="Reconsultar status"
                      >
                        {loadingRef === p.referencia ? "Atualizando..." : "Atualizar status"}
                      </button>

                      <button
                        onClick={() => copiar(p.referencia)}
                        className="text-gray-700 hover:underline"
                        title="Copiar referência"
                      >
                        Copiar ref
                      </button>

                      {p.ticket_url ? (
                        <a
                          href={p.ticket_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:underline"
                          title="Abrir link de pagamento / 2ª via"
                        >
                          Abrir link
                        </a>
                      ) : null}

                      {p.entrega?.habilitada ? (
                        <button
                          onClick={() => setOpenEntrega(p.entrega || null)}
                          className="text-indigo-700 hover:underline"
                          title="Ver endereço de entrega"
                        >
                          Entrega
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Entrega */}
        {openEntrega && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setOpenEntrega(null)}
          >
            <div
              className="w-full max-w-md rounded-xl bg-white shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Endereço de entrega</h3>
                <button
                  onClick={() => setOpenEntrega(null)}
                  className="rounded p-1 hover:bg-gray-100"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <div className="text-sm leading-6">
                <div><strong>CEP:</strong> {openEntrega.cep || "—"}</div>
                <div><strong>Rua:</strong> {openEntrega.rua || "—"}</div>
                <div><strong>Número:</strong> {openEntrega.numero || "—"}</div>
                <div><strong>Complemento:</strong> {openEntrega.complemento || "—"}</div>
                <div><strong>Bairro:</strong> {openEntrega.bairro || "—"}</div>
                <div><strong>Cidade/UF:</strong> {openEntrega.cidade || "—"} / {openEntrega.uf || "—"}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
