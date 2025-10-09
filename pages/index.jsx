import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/* ===== Helpers ===== */
const onlyDigits = (s = "") => s.replace(/\D/g, "");
const nameParts  = (n = "") => {
  const p = n.trim().split(/\s+/);
  return { first: p[0] || n || "", last: p.slice(1).join(" ") || "-" };
};
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const safeJson = (t) => { try { return JSON.parse(t); } catch { return null; } };

/* ===== Modal simples ===== */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  /* ===== estado ===== */
  const [acessos, setAcessos] = useState(null);

  // assinatura / produto
  const [assinatura, setAssinatura] = useState({ id: null, descricao: "Assinatura mensal", preco: 99.0 });

  // modal pagamento
  const [openPay, setOpenPay] = useState(false);
  const [payEmail, setPayEmail] = useState("");
  const [payCPF, setPayCPF] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [pixResp, setPixResp] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  /* ===== carregar acessos ===== */
  useEffect(() => {
    if (session) {
      fetch("/api/usuarios/acessos")
        .then((r) => r.json())
        .then(setAcessos)
        .catch(() => {});
    }
  }, [session]);

  /* ===== buscar produto Assinatura (empresa 1) ===== */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/store/products?empresaId=1");
        if (!r.ok) return;
        const arr = await r.json();
        const prod = (arr || []).find((p) =>
          String(p.descricao || "").toLowerCase().includes("assinatura")
        );
        if (prod) setAssinatura({ id: prod.id, descricao: prod.descricao, preco: Number(prod.preco) });
      } catch {}
    })();
  }, []);

  /* ===== expiração ===== */
  const diasRestantes = useMemo(() => {
    if (!session?.user?.expiracao) return null;
    const d = new Date(session.user.expiracao);
    return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [session?.user?.expiracao]);

  const expirado = diasRestantes !== null && diasRestantes < 0;

  /* ===== login manuais ===== */
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  async function handleCredLogin(e) {
    e.preventDefault();
    await signIn("credentials", { email, senha, redirect: true, callbackUrl: "/" });
  }

  /* ===== abrir modal de pagamento ===== */
  function abrirRenovacao() {
    setStatusMsg("");
    setPixResp(null);
    setPayEmail(session?.user?.email || "");
    setPayCPF("");
    setOpenPay(true);
  }

  /* ===== pagar por PIX (solicita email + cpf) ===== */
  async function pagarPIX() {
    setStatusMsg("");
    if (!payEmail || onlyDigits(payCPF).length !== 11) {
      setStatusMsg("Informe e-mail e CPF válidos.");
      return;
    }
    setPayLoading(true);
    try {
      const empresaId = session?.user?.empresa || 1;
      const { first, last } = nameParts(session?.user?.name || payEmail);
      const referencia = `emp${empresaId}-${Date.now()}`;
      const r = await fetch("/api/mp/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(assinatura.preco),
          description: assinatura.descricao,
          referenceId: referencia,
          payer: {
            email: payEmail,
            first_name: first,
            last_name: last,
            cpf: onlyDigits(payCPF),
          },
        }),
      });
      const text = await r.text();
      const data = safeJson(text) || { message: text };

      if (!r.ok) {
        const cause =
          Array.isArray(data?.cause) ? data.cause.map((c) => `${c.code}: ${c.description}`).join(" | ")
          : data?.message || "Falha ao criar PIX.";
        setStatusMsg(cause);
        return;
      }

      setPixResp(data); // { qr_image_url, qr_text, ticket_url, chargeId, ... }
      setStatusMsg("PIX criado! Escaneie o QR ou copie o código.");
    } catch (e) {
      setStatusMsg(`Erro: ${e?.message || e}`);
    } finally {
      setPayLoading(false);
    }
  }

  function copyToClipboard(s) {
    if (!s) return;
    navigator.clipboard.writeText(s).then(
      () => setStatusMsg("Código PIX copiado!"),
      () => setStatusMsg("Não foi possível copiar.")
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        ⏳ Verificando sessão...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <main className="flex flex-col flex-1 items-center justify-center text-center px-6">
        {!session ? (
          // ----------- Tela de login -----------
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              Bem-vindo ao <span className="text-blue-600">App IasTec</span>
            </h2>

            <button
              onClick={() => signIn("google")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded w-full mb-4"
            >
              Entrar com Google
            </button>

            <form onSubmit={handleCredLogin} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                className="w-full border rounded px-3 py-2"
              />
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded w-full"
              >
                Entrar
              </button>
            </form>
          </div>
        ) : (
          // ----------- Tela logado -----------
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 max-w-xl w-full">
            <h2 className="text-2xl font-bold mb-2">
              👋 Bem-vindo, {session.user?.name || session.user?.email}
              <div className="text-base font-normal">Empresa: {session?.user?.empresa}</div>
            </h2>

            {session.user?.expiracao && (
              <p className="text-gray-600 mb-4">
                Expira em: {new Date(session.user.expiracao).toLocaleDateString("pt-BR")}
              </p>
            )}

            {/* Avisos de validade/expiração */}
            {!expirado && diasRestantes !== null && diasRestantes <= 10 && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                ✅ Seu acesso via Google é válido por 10 dias.
              </div>
            )}

            {expirado && (
              <div className="bg-amber-100 border border-amber-400 text-amber-800 px-4 py-3 rounded mb-4">
                Sua assinatura expirou. Renove para voltar a usar todos os recursos.
              </div>
            )}

            {/* Botões principais */}
            <div className="space-y-3">
              {/* Renovar + Pedidos SEMPRE visíveis */}
              <button
                onClick={abrirRenovacao}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2 rounded flex items-center justify-center gap-2"
                title={`Renovar por ${brl(assinatura.preco)}`}
              >
                <span>🔄</span> Renovar assinatura — {brl(assinatura.preco)}
              </button>

              <Link
                href={`/pedidos${session.user?.email ? `?email=${encodeURIComponent(session.user.email)}` : ""}`}
                className="block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded"
              >
                🧾 Meus pedidos
              </Link>

              {/* Os demais acessos ficam escondidos se expirado */}
              {!expirado && (
                <>
                  {acessos?.servicos && (
                    <Link href="/servicos" className="block bg-purple-600 text-white px-6 py-2 rounded">
                      ⚙️ Serviços
                    </Link>
                  )}
                  {acessos?.dashboard && (
                    <Link href="/dashboard" className="block bg-yellow-500 text-white px-6 py-2 rounded">
                      📊 Dashboard
                    </Link>
                  )}
                  {acessos?.inventario && (
                    <Link href="/contagem" className="block bg-blue-600 text-white px-6 py-2 rounded">
                      📦 Inventário
                    </Link>
                  )}
                  {acessos?.produtos && (
                    <Link href="/produtos" className="block bg-green-600 text-white px-6 py-2 rounded">
                      🛒 Produtos
                    </Link>
                  )}
                  {acessos?.compras && (
                    <Link href="/compras" className="block bg-indigo-600 text-white px-6 py-2 rounded">
                      💰 Compras
                    </Link>
                  )}
                  {acessos?.comercial && (
                    <Link href="/orcamento" className="block bg-pink-500 text-white px-6 py-2 rounded">
                      📑 Comercial
                    </Link>
                  )}
                  {acessos?.buckman && (
                    <Link href="/relatorio_mensal_vendedor_comissao" className="block bg-gray-700 text-white px-6 py-2 rounded">
                      📈 Relatório Mensal por Vendedor
                    </Link>
                  )}
                  {session.user?.role === "admin" && (
                    <>
                      <Link href="/usuarios" className="block bg-red-500 text-white px-6 py-2 rounded">
                        👥 Usuários
                      </Link>
                      <Link href="/acessos" className="block bg-orange-500 text-white px-6 py-2 rounded">
                        🔐 Acessos
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Sair */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded"
            >
              Sair
            </button>
          </div>
        )}
      </main>

      <footer className="w-full bg-gray-200 text-center py-4 text-sm text-gray-600">
        iastec 2025 - versão 3.0
      </footer>

      {/* Modal de pagamento (PIX) */}
      <Modal open={openPay} onClose={() => setOpenPay(false)} title="Renovar assinatura">
        {!pixResp ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Valor: <strong>{brl(assinatura.preco)}</strong> — {assinatura.descricao}
            </div>

            <input
              className="w-full border rounded px-3 py-2"
              placeholder="Seu e-mail"
              value={payEmail}
              onChange={(e) => setPayEmail(e.target.value)}
            />
            <input
              className="w-full border rounded px-3 py-2"
              placeholder="CPF"
              value={payCPF}
              onChange={(e) => setPayCPF(e.target.value)}
            />

            <button
              onClick={pagarPIX}
              disabled={payLoading}
              className={`w-full rounded py-2 text-white ${payLoading ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"}`}
            >
              {payLoading ? "Gerando PIX..." : "Pagar com PIX"}
            </button>

            {statusMsg && <p className="text-sm text-center text-gray-700">{statusMsg}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {pixResp.qr_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pixResp.qr_image_url}
                alt="QR Code PIX"
                className="w-56 h-56 mx-auto rounded"
              />
            ) : (
              <p className="text-center text-sm text-gray-600">
                Não recebemos a imagem do QR. Use o botão abaixo:
              </p>
            )}

            <div className="text-center">
              <button
                className="rounded bg-blue-600 text-white px-3 py-2 hover:bg-blue-700"
                onClick={() => copyToClipboard(pixResp.qr_text)}
              >
                Copiar código PIX
              </button>
            </div>

            {pixResp.ticket_url && (
              <a
                href={pixResp.ticket_url}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-blue-600 hover:underline"
              >
                Abrir link de pagamento
              </a>
            )}

            <p className="text-xs text-gray-500 text-center">
              ID: {String(pixResp.chargeId || "")}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
