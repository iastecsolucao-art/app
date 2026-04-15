import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";

/* ===== Helpers ===== */
const onlyDigits = (s = "") => s.replace(/\D/g, "");
const nameParts  = (n = "") => {
  const p = n.trim().split(/\s+/);
  return { first: p[0] || n || "", last: p.slice(1).join(" ") || "-" };
};
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const safeJson = (t) => { try { return JSON.parse(t); } catch { return null; } };

/* ===== Catálogo completo de atalhos disponíveis ===== */
// Cada atalho tem: id, label, href, cor (classe tailwind), emoji, requerAcesso (chave de `acessos`)
const CATALOGO_ATALHOS = [
  { id: "renovar",     label: "Renovar Assinatura",    href: "#renovar",                          cor: "bg-emerald-700 hover:bg-emerald-800", emoji: "🔄", requerAcesso: null,        tipo: "action" },
  { id: "pedidos",     label: "Meus Pedidos",           href: "/pedidos",                          cor: "bg-indigo-600 hover:bg-indigo-700",   emoji: "🧾", requerAcesso: null,        tipo: "link" },
  { id: "dashboard",  label: "Dashboard",              href: "/dashboard",                        cor: "bg-yellow-500 hover:bg-yellow-600",   emoji: "📊", requerAcesso: "dashboard", tipo: "link" },
  { id: "inventario", label: "Inventário",             href: "/contagem",                         cor: "bg-blue-600 hover:bg-blue-700",       emoji: "📦", requerAcesso: "inventario",tipo: "link" },
  { id: "produtos",   label: "Produtos",               href: "/produtos",                         cor: "bg-green-600 hover:bg-green-700",     emoji: "🛒", requerAcesso: "produtos",  tipo: "link" },
  { id: "compras",    label: "Compras",                href: "/compras",                          cor: "bg-cyan-600 hover:bg-cyan-700",       emoji: "💰", requerAcesso: "compras",   tipo: "link" },
  { id: "comercial",  label: "Comercial",              href: "/orcamento",                        cor: "bg-pink-500 hover:bg-pink-600",       emoji: "📑", requerAcesso: "comercial", tipo: "link" },
  { id: "servicos",   label: "Serviços",               href: "/servicos",                         cor: "bg-purple-600 hover:bg-purple-700",   emoji: "⚙️", requerAcesso: "servicos",  tipo: "link" },
  { id: "agendamento",label: "Agendamento",            href: "/agendamento",                      cor: "bg-teal-600 hover:bg-teal-700",       emoji: "📅", requerAcesso: "servicos",  tipo: "link" },
  { id: "clientes",   label: "Clientes",               href: "/clientes",                         cor: "bg-orange-500 hover:bg-orange-600",   emoji: "👤", requerAcesso: null,  tipo: "link" },
  { id: "buckman",    label: "Buckman",                href: "/relatorio_mensal_vendedor_comissao",cor: "bg-gray-700 hover:bg-gray-800",       emoji: "📈", requerAcesso: "buckman",   tipo: "link" },
  { id: "usuarios",   label: "Usuários",               href: "/usuarios",                         cor: "bg-red-500 hover:bg-red-600",         emoji: "👥", requerAcesso: null,        role: "admin", tipo: "link" },
  { id: "acessos",    label: "Acessos",                href: "/acessos",                          cor: "bg-orange-500 hover:bg-orange-600",   emoji: "🔐", requerAcesso: null,        role: "admin", tipo: "link" },
  { id: "planos",     label: "Planos",                 href: "/admin/planos",                     cor: "bg-yellow-400 hover:bg-yellow-500",   emoji: "⭐", requerAcesso: null,        role: "admin", tipo: "link" },
];

const DEFAULTS = ["renovar", "pedidos", "dashboard", "produtos"];

/* ===== Modal genérico ===== */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-lg text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-500">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  const [acessos, setAcessos] = useState(null);
  const [shortcuts, setShortcuts] = useState(null); // null = carregando
  const [showConfig, setShowConfig] = useState(false);
  const [draftShortcuts, setDraftShortcuts] = useState([]);
  const [savingConfig, setSavingConfig] = useState(false);

  // PIX / assinatura
  const [assinatura, setAssinatura] = useState({ id: null, descricao: "Assinatura mensal", preco: 99.0 });
  const [openPay, setOpenPay] = useState(false);
  const [payEmail, setPayEmail] = useState("");
  const [payCPF, setPayCPF] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [pixResp, setPixResp] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  /* carregar acessos */
  useEffect(() => {
    if (session) {
      fetch("/api/usuarios/acessos").then(r => r.json()).then(setAcessos).catch(() => {});
    }
  }, [session]);

  /* carregar shortcuts personalizados */
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetch("/api/usuarios/home-shortcuts")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!cancelled) setShortcuts(d?.shortcuts?.length > 0 ? d.shortcuts : DEFAULTS);
      })
      .catch(() => { if (!cancelled) setShortcuts(DEFAULTS); });
    // Safety timeout: se não carregar em 5s, usa DEFAULTS
    const t = setTimeout(() => { if (!cancelled) setShortcuts(prev => prev ?? DEFAULTS); }, 5000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [session]);

  /* produto assinatura */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/store/products?empresaId=1");
        if (!r.ok) return;
        const arr = await r.json();
        const prod = (arr || []).find(p => String(p.descricao || "").toLowerCase().includes("assinatura"));
        if (prod) setAssinatura({ id: prod.id, descricao: prod.descricao, preco: Number(prod.preco) });
      } catch {}
    })();
  }, []);

  const diasRestantes = useMemo(() => {
    if (!session?.user?.expiracao) return null;
    const d = new Date(session.user.expiracao);
    return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }, [session?.user?.expiracao]);

  const expirado = diasRestantes !== null && diasRestantes < 0;

  /* login manual */
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  async function handleCredLogin(e) {
    e.preventDefault();
    await signIn("credentials", { email, senha, redirect: true, callbackUrl: "/" });
  }

  /* PIX */
  function abrirRenovacao() {
    setStatusMsg(""); setPixResp(null);
    setPayEmail(session?.user?.email || ""); setPayCPF(""); setOpenPay(true);
  }
  async function pagarPIX() {
    setStatusMsg("");
    if (!payEmail || onlyDigits(payCPF).length !== 11) { setStatusMsg("Informe e-mail e CPF válidos."); return; }
    setPayLoading(true);
    try {
      const empresaId = session?.user?.empresa || 1;
      const { first, last } = nameParts(session?.user?.name || payEmail);
      const r = await fetch("/api/mp/pix", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(assinatura.preco), description: assinatura.descricao,
          referenceId: `emp${empresaId}-${Date.now()}`,
          payer: { email: payEmail, first_name: first, last_name: last, cpf: onlyDigits(payCPF) } })
      });
      const text = await r.text();
      const data = safeJson(text) || { message: text };
      if (!r.ok) {
        const cause = Array.isArray(data?.cause) ? data.cause.map(c => `${c.code}: ${c.description}`).join(" | ") : data?.message || "Falha ao criar PIX.";
        setStatusMsg(cause); return;
      }
      setPixResp(data); setStatusMsg("PIX criado! Escaneie o QR ou copie o código.");
    } catch (e) { setStatusMsg(`Erro: ${e?.message || e}`); }
    finally { setPayLoading(false); }
  }
  function copyToClipboard(s) {
    if (!s) return;
    navigator.clipboard.writeText(s).then(() => setStatusMsg("Código PIX copiado!"), () => setStatusMsg("Não foi possível copiar."));
  }

  /* Configuração de atalhos */
  function abrirConfig() {
    setDraftShortcuts(shortcuts || DEFAULTS);
    setShowConfig(true);
  }
  function toggleShortcut(id) {
    setDraftShortcuts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }
  async function salvarConfig() {
    setSavingConfig(true);
    try {
      await fetch("/api/usuarios/home-shortcuts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortcuts: draftShortcuts })
      });
      setShortcuts(draftShortcuts);
      setShowConfig(false);
      // Notifica a Navbar para recarregar os shortcuts
      window.dispatchEvent(new CustomEvent("shortcuts-updated", { detail: draftShortcuts }));
    } finally { setSavingConfig(false); }
  }

  /* Filtrar atalhos visíveis com base em acessos e role */
  const atalhosVisiveis = useMemo(() => {
    if (!shortcuts || !acessos) return [];
    return shortcuts
      .map(id => CATALOGO_ATALHOS.find(a => a.id === id))
      .filter(Boolean)
      .filter(a => {
        if (a.requerAcesso && !acessos[a.requerAcesso]) return false;
        if (a.role && session?.user?.role !== a.role) return false;
        return true;
      });
  }, [shortcuts, acessos, session]);

  /* Atalhos disponíveis levando em conta acessos e role */
  const atalhosDisponiveis = useMemo(() => {
    if (!acessos) return CATALOGO_ATALHOS;
    return CATALOGO_ATALHOS.filter(a => {
      if (a.requerAcesso && !acessos[a.requerAcesso]) return false;
      if (a.role && session?.user?.role !== a.role) return false;
      return true;
    });
  }, [acessos, session]);

  if (status === "loading") {
    return <div className="flex items-center justify-center h-screen text-gray-600 text-lg">⏳ Verificando sessão...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <main className="flex flex-col flex-1 items-center justify-center px-4 py-8">

        {!session ? (
          /* -------- Tela de Login -------- */
          <div className="bg-white shadow-lg rounded-2xl px-8 pt-7 pb-8 max-w-md w-full border border-gray-100">
            <div className="text-center mb-6">
              <span className="text-4xl">🏢</span>
              <h1 className="text-2xl font-extrabold text-gray-900 mt-2">IasTec</h1>
              <p className="text-gray-500 text-sm mt-1">Plataforma de gestão empresarial</p>
            </div>

            <button onClick={() => signIn("google")}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-2.5 rounded-xl w-full mb-4 flex items-center justify-center gap-2 shadow-sm transition">
              <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Entrar com Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <form onSubmit={handleCredLogin} className="space-y-3">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="E-mail"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha"
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl w-full transition">
                Entrar
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500 mb-2">Não tem conta ainda?</p>
              <Link href="/cadastro" className="block w-full text-center border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold px-6 py-2.5 rounded-xl transition">
                Criar conta gratuita →
              </Link>
            </div>
          </div>
        ) : (
          /* -------- Tela Logado -------- */
          <div className="bg-white shadow-lg rounded-2xl px-6 pt-7 pb-7 max-w-sm w-full border border-gray-100">
            {/* Header usuario */}
            <div className="text-center mb-4">
              <div className="w-14 h-14 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-2xl font-extrabold mx-auto mb-2">
                {(session.user?.name || session.user?.email || "?")[0].toUpperCase()}
              </div>
              <h2 className="text-lg font-extrabold text-gray-900">{session.user?.name || session.user?.email}</h2>
              {session.user?.empresa && <div className="text-sm text-gray-500">🏢 {session.user.empresa}</div>}
              {session.user?.expiracao && (
                <div className={`text-xs mt-1 font-medium ${expirado ? "text-red-500" : "text-green-600"}`}>
                  {expirado ? "❌ Assinatura vencida" : `✅ Válido até ${new Date(session.user.expiracao).toLocaleDateString("pt-BR")}`}
                </div>
              )}
            </div>

            {expirado && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg mb-3 text-center">
                Sua assinatura expirou. Renove para acessar todos os recursos.
              </div>
            )}

            {/* Atalhos personalizados */}
            <div className="space-y-2.5 mb-4">
              {shortcuts === null ? (
                <div className="text-center text-gray-400 text-sm py-4 animate-pulse">Carregando atalhos...</div>
              ) : (
                atalhosVisiveis.map(atalho => {
                  if (atalho.id === "renovar") {
                    return (
                      <button key="renovar" onClick={abrirRenovacao}
                        className={`w-full ${atalho.cor} text-white font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition text-sm`}>
                        {atalho.emoji} {atalho.label} — {brl(assinatura.preco)}
                      </button>
                    );
                  }
                  if (expirado && atalho.id !== "renovar" && atalho.id !== "pedidos") return null;
                  return (
                    <Link key={atalho.id} href={atalho.href}
                      className={`block w-full ${atalho.cor} text-white font-semibold px-4 py-2.5 rounded-xl text-center transition text-sm`}>
                      {atalho.emoji} {atalho.label}
                    </Link>
                  );
                })
              )}
            </div>

            {/* Rodapé ações */}
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              <button onClick={abrirConfig}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 py-2 rounded-xl transition font-medium">
                ⚙️ Personalizar
              </button>
              <button onClick={() => signOut({ callbackUrl: "/" })}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm text-red-600 border border-red-200 hover:bg-red-50 py-2 rounded-xl transition font-medium">
                🚪 Sair
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-3 text-xs text-gray-400 border-t border-gray-100">
        IasTec © {new Date().getFullYear()} — versão 4.0
      </footer>

      {/* ===== Modal de Configuração de Atalhos ===== */}
      <Modal open={showConfig} onClose={() => setShowConfig(false)} title="⚙️ Personalizar Tela Inicial">
        <p className="text-sm text-gray-500 mb-4">Escolha quais atalhos aparecem na sua tela inicial. Arraste para reordenar.</p>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {atalhosDisponiveis.map(atalho => {
            const ativo = draftShortcuts.includes(atalho.id);
            return (
              <label key={atalho.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${ativo ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input type="checkbox" checked={ativo} onChange={() => toggleShortcut(atalho.id)} className="w-4 h-4 accent-blue-600" />
                <div className={`w-8 h-8 rounded-lg ${atalho.cor.split(" ")[0]} flex items-center justify-center text-white text-base shrink-0`}>
                  {atalho.emoji}
                </div>
                <span className="font-medium text-gray-800 text-sm">{atalho.label}</span>
                {ativo && <span className="ml-auto text-xs text-blue-500 font-semibold">✓ Ativo</span>}
              </label>
            );
          })}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => setShowConfig(false)}
            className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition text-sm">
            Cancelar
          </button>
          <button onClick={salvarConfig} disabled={savingConfig}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-sm disabled:opacity-60">
            {savingConfig ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </Modal>

      {/* ===== Modal PIX ===== */}
      <Modal open={openPay} onClose={() => setOpenPay(false)} title="🔄 Renovar assinatura">
        {!pixResp ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 text-center">
              Valor: <strong>{brl(assinatura.preco)}</strong> — {assinatura.descricao}
            </div>
            <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="Seu e-mail"
              value={payEmail} onChange={e => setPayEmail(e.target.value)} />
            <input className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="CPF (apenas números)"
              value={payCPF} onChange={e => setPayCPF(e.target.value)} />
            <button onClick={pagarPIX} disabled={payLoading}
              className={`w-full rounded-xl py-2.5 text-white font-bold ${payLoading ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"} transition`}>
              {payLoading ? "Gerando PIX..." : "Pagar com PIX"}
            </button>
            {statusMsg && <p className="text-sm text-center text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{statusMsg}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {pixResp.qr_image_url
              ? <img src={pixResp.qr_image_url} alt="QR Code PIX" className="w-48 h-48 mx-auto rounded-xl shadow" />
              : <p className="text-center text-sm text-gray-600">Não recebemos a imagem do QR. Use o botão abaixo:</p>}
            <button className="w-full rounded-xl bg-blue-600 text-white px-4 py-2.5 font-bold hover:bg-blue-700 transition"
              onClick={() => copyToClipboard(pixResp.qr_text)}>
              Copiar código PIX
            </button>
            {pixResp.ticket_url && (
              <a href={pixResp.ticket_url} target="_blank" rel="noreferrer"
                className="block text-center text-blue-600 hover:underline text-sm">
                Abrir link de pagamento
              </a>
            )}
            <p className="text-xs text-gray-400 text-center">ID: {String(pixResp.chargeId || "")}</p>
            {statusMsg && <p className="text-sm text-center text-gray-700">{statusMsg}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
