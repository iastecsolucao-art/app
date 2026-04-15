import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { signIn } from "next-auth/react";

// ——— Ícones inline simples ———
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-yellow-400">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const STEPS = ["Usuário", "Empresa", "Plano"];

const PLANOS_FALLBACK = [
  { nome: "Bronze",    preco: 0,    max_usuarios: 2,  menus_permitidos: ["dashboard","produtos"],              descricao: "Comece gratuitamente" },
  { nome: "Prata",     preco: 79,   max_usuarios: 5,  menus_permitidos: ["dashboard","produtos","comercial","compras"], descricao: "Para pequenas equipes" },
  { nome: "Ouro",      preco: 149,  max_usuarios: 10, menus_permitidos: ["dashboard","produtos","comercial","compras","inventario","servicos"], descricao: "Recursos completos" },
];

const corPlano = { Bronze: "orange", Prata: "slate", Ouro: "yellow" };

function PlanCard({ plano, onSelect, selected, recomendado }) {
  const cor = corPlano[plano.nome] || "blue";
  const ringClass = selected ? `ring-2 ring-${cor}-500 shadow-lg` : "hover:shadow-md";
  return (
    <div
      onClick={() => onSelect(plano.nome)}
      className={`relative cursor-pointer rounded-2xl border border-gray-200 bg-white p-6 transition-all ${ringClass}`}
    >
      {recomendado && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <IconStar /> Recomendado
        </span>
      )}
      <div className={`text-sm font-bold uppercase tracking-widest text-${cor}-600 mb-1`}>{plano.nome}</div>
      <div className="text-3xl font-extrabold text-gray-900 mb-1">
        {plano.preco === 0 ? "Grátis" : `R$ ${plano.preco}`}
        {plano.preco > 0 && <span className="text-sm font-normal text-gray-400">/mês</span>}
      </div>
      <p className="text-gray-500 text-sm mb-4">{plano.descricao}</p>
      <ul className="space-y-2 text-sm text-gray-700">
        <li className="flex items-center gap-2 text-green-600"><IconCheck /> Até {plano.max_usuarios} usuários</li>
        {plano.menus_permitidos.map(m => (
          <li key={m} className="flex items-center gap-2 capitalize"><IconCheck />{m}</li>
        ))}
      </ul>
      <button
        className={`mt-6 w-full py-2.5 rounded-xl font-bold transition ${
          selected
            ? `bg-${cor}-600 text-white`
            : `border border-${cor}-400 text-${cor}-700 hover:bg-${cor}-50`
        }`}
      >
        {selected ? "✓ Selecionado" : "Escolher"}
      </button>
    </div>
  );
}

export default function Cadastro() {
  const [step, setStep] = useState(0); // 0=usuario 1=empresa 2=plano 3=sucesso
  const [planos, setPlanos] = useState(PLANOS_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Dados acumulados por etapa
  const [empresaId, setEmpresaId] = useState(null);
  const [planoSelecionado, setPlanoSelecionado] = useState("Prata");

  const [formUser, setFormUser] = useState({ nome: "", email: "", senha: "", confirmar: "" });
  const [formEmp, setFormEmp] = useState({ nome: "", cnpj: "" });

  useEffect(() => {
    fetch("/api/superadmin/planos-pub")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (Array.isArray(data) && data.length) setPlanos(data); })
      .catch(() => {});
  }, []);

  /* ---- helpers ---- */
  const next = () => { setError(""); setStep(s => s + 1); };
  const setField = (setter) => (e) => setter(p => ({ ...p, [e.target.name]: e.target.value }));

  /* ---- STEP 0: Criar usuário ---- */
  async function submitUsuario(e) {
    e.preventDefault();
    setError("");
    if (!formUser.nome || !formUser.email || !formUser.senha) return setError("Preencha todos os campos.");
    if (formUser.senha !== formUser.confirmar) return setError("As senhas não coincidem.");
    if (formUser.senha.length < 6) return setError("Senha precisa ter ao menos 6 caracteres.");
    next();
  }

  /* ---- STEP 1: Criar empresa ---- */
  async function submitEmpresa(e) {
    e.preventDefault();
    setError("");
    if (!formEmp.nome) return setError("Informe o nome da empresa.");
    setLoading(true);
    try {
      const r = await fetch("/api/publico/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "empresa", nome: formEmp.nome, cnpj: formEmp.cnpj })
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Erro na empresa."); return; }
      setEmpresaId(data.empresa.id);
      next();
    } finally {
      setLoading(false);
    }
  }

  /* ---- STEP 2: Finalizar (criar user + vincular plano) ---- */
  async function submitPlano(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Criar usuário
      const r1 = await fetch("/api/publico/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "usuario", nome: formUser.nome, email: formUser.email, senha: formUser.senha, empresa_id: empresaId })
      });
      const d1 = await r1.json();
      if (!r1.ok) { setError(d1.error || "Erro ao criar usuário."); return; }

      // Vincular plano
      await fetch("/api/publico/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "plano", empresa_id: empresaId, plano: planoSelecionado })
      });
      setStep(3); // sucesso
    } finally {
      setLoading(false);
    }
  }

  /* ---- STEP 3: Fazer login automático ---- */
  async function fazerLogin() {
    setLoading(true);
    await signIn("credentials", { email: formUser.email, senha: formUser.senha, redirect: true, callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col">
      <Head>
        <title>Criar conta — IasTec</title>
        <meta name="description" content="Crie sua conta no IasTec e comece a gerir seu negócio hoje." />
      </Head>

      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between">
        <div className="text-2xl font-extrabold text-blue-700 tracking-tight">IasTec</div>
        <Link href="/" className="text-sm text-gray-500 hover:text-blue-600 font-medium transition">
          Já tenho conta →
        </Link>
      </header>

      {/* Progress bar */}
      {step < 3 && (
        <div className="max-w-xl mx-auto w-full px-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  i < step ? "bg-blue-600 text-white" : i === step ? "bg-blue-600 text-white ring-4 ring-blue-200" : "bg-gray-200 text-gray-500"
                }`}>
                  {i < step ? <IconCheck /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${i === step ? "text-blue-700" : "text-gray-400"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`h-px w-12 sm:w-20 ${i < step ? "bg-blue-600" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">

        {/* STEP 0: Dados do usuário */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-8">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Crie sua conta</h1>
            <p className="text-gray-500 text-sm mb-6">Comece em 3 passos simples — é rápido!</p>
            <form onSubmit={submitUsuario} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Nome completo</label>
                <input name="nome" type="text" required placeholder="João da Silva"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={formUser.nome} onChange={setField(setFormUser)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">E-mail</label>
                <input name="email" type="email" required placeholder="joao@empresa.com"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={formUser.email} onChange={setField(setFormUser)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Senha</label>
                <input name="senha" type="password" required placeholder="Min. 6 caracteres"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={formUser.senha} onChange={setField(setFormUser)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Confirmar senha</label>
                <input name="confirmar" type="password" required placeholder="Repita a senha"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={formUser.confirmar} onChange={setField(setFormUser)} />
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition">
                Continuar →
              </button>
            </form>
          </div>
        )}

        {/* STEP 1: Empresa */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-8">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Sua empresa</h1>
            <p className="text-gray-500 text-sm mb-6">Todos os usuários da mesma empresa compartilharão o mesmo plano.</p>
            <form onSubmit={submitEmpresa} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">Nome da empresa *</label>
                <input name="nome" type="text" required placeholder="Minha Empresa Ltda."
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={formEmp.nome} onChange={setField(setFormEmp)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1.5">CNPJ (opcional)</label>
                <input name="cnpj" type="text" placeholder="00.000.000/0001-00"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={formEmp.cnpj} onChange={setField(setFormEmp)} />
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(0)}
                  className="flex-1 border border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition">
                  ← Voltar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60">
                  {loading ? "Salvando..." : "Continuar →"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Escolha do Plano */}
        {step === 2 && (
          <div className="w-full max-w-4xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Escolha seu plano</h1>
              <p className="text-gray-500 text-base">Você pode mudar de plano a qualquer momento. Comece com o melhor para o seu momento atual.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {planos.map((p, i) => (
                <PlanCard
                  key={p.nome}
                  plano={p}
                  selected={planoSelecionado === p.nome}
                  recomendado={i === 1 || (planos.length === 1)}
                  onSelect={setPlanoSelecionado}
                />
              ))}
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 max-w-md mx-auto text-center">{error}</p>}
            <div className="flex gap-4 justify-center">
              <button onClick={() => setStep(1)}
                className="px-8 py-3 border border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition">
                ← Voltar
              </button>
              <button onClick={submitPlano} disabled={loading}
                className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-60">
                {loading ? "Criando conta..." : "Finalizar cadastro 🚀"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Sucesso */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-10 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🎉</div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Conta criada!</h1>
            <p className="text-gray-500 mb-2">
              Bem-vindo, <strong>{formUser.nome}</strong>!<br />
              Empresa: <strong>{formEmp.nome}</strong><br />
              Plano: <span className="font-bold text-blue-700">{planoSelecionado}</span>
            </p>
            <p className="text-xs text-gray-400 mb-6">Você tem 15 dias de acesso de avaliação.</p>
            <button onClick={fazerLogin} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition disabled:opacity-60">
              {loading ? "Entrando..." : "Entrar no sistema →"}
            </button>
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        © {new Date().getFullYear()} IasTec — Todos os direitos reservados
      </footer>
    </div>
  );
}
