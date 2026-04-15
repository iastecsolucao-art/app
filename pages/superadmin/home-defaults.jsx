import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";

// Mesmo catálogo que o index.jsx
const CATALOGO_ATALHOS = [
  { id: "renovar",     label: "Renovar Assinatura",     emoji: "🔄", cor: "bg-emerald-600", desc: "Botão de renovar assinatura via PIX" },
  { id: "pedidos",     label: "Meus Pedidos",            emoji: "🧾", cor: "bg-indigo-600",  desc: "Histórico de pedidos do usuário" },
  { id: "dashboard",  label: "Dashboard",               emoji: "📊", cor: "bg-yellow-500",  desc: "Visão geral e indicadores" },
  { id: "inventario", label: "Inventário",              emoji: "📦", cor: "bg-blue-600",    desc: "Contagem e controle de estoque" },
  { id: "produtos",   label: "Produtos",                emoji: "🛒", cor: "bg-green-600",   desc: "Cadastro e lista de produtos" },
  { id: "compras",    label: "Compras",                 emoji: "💰", cor: "bg-cyan-600",    desc: "Registro de novas compras" },
  { id: "comercial",  label: "Comercial",               emoji: "📑", cor: "bg-pink-500",    desc: "Orçamentos e vendas" },
  { id: "servicos",   label: "Serviços",                emoji: "⚙️",  cor: "bg-purple-600",  desc: "Módulo de serviços e agendamentos" },
  { id: "agendamento",label: "Agendamento",             emoji: "📅", cor: "bg-teal-600",    desc: "Calendário de agendamentos" },
  { id: "clientes",   label: "Clientes",                emoji: "👤", cor: "bg-orange-500",  desc: "Cadastro de clientes" },
  { id: "buckman",    label: "Buckman",                 emoji: "📈", cor: "bg-gray-700",    desc: "Relatórios e metas de vendedores" },
  { id: "usuarios",   label: "Usuários",                emoji: "👥", cor: "bg-red-500",     desc: "Gestão de usuários (só admins)" },
  { id: "acessos",    label: "Acessos",                 emoji: "🔐", cor: "bg-orange-500",  desc: "Permissões de menus (só admins)" },
  { id: "planos",     label: "Planos",                  emoji: "⭐", cor: "bg-yellow-400",  desc: "Visualização dos planos disponíveis" },
];

export default function HomeDefaultsPage() {
  const { data: session } = useSession();
  const [shortcuts, setShortcuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/superadmin/home-defaults")
      .then(r => r.json())
      .then(d => { setShortcuts(d.shortcuts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function toggle(id) {
    setShortcuts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setSaved(false);
  }

  async function salvar() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/superadmin/home-defaults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortcuts })
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  // Preview da ordem
  const previewAtivos = shortcuts.map(id => CATALOGO_ATALHOS.find(a => a.id === id)).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pt-24 pb-12 px-4">
      <Head>
        <title>Menu Padrão Inicial — SuperAdmin</title>
      </Head>

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8 border-b border-gray-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-blue-600 font-bold tracking-widest uppercase text-xs mb-1">Super Admin / Configuração</p>
            <h1 className="text-3xl font-extrabold text-gray-900">Menu Inicial Padrão</h1>
            <p className="text-gray-500 text-sm mt-1.5 max-w-lg">
              Defina quais atalhos todos os novos usuários verão por padrão na tela inicial. 
              Cada usuário pode personalizar o próprio depois.
            </p>
          </div>
          <Link href="/superadmin" className="text-sm text-blue-600 hover:underline font-medium">
            ← Voltar ao Painel
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Coluna Esquerda: Seleção */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="font-bold text-gray-800">Atalhos Disponíveis</h2>
                <p className="text-xs text-gray-500 mt-0.5">Marque os que devem aparecer para todos por padrão</p>
              </div>
              <div className="p-4 space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-gray-400 animate-pulse">Carregando...</div>
                ) : (
                  CATALOGO_ATALHOS.map(atalho => {
                    const ativo = shortcuts.includes(atalho.id);
                    return (
                      <label key={atalho.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition select-none ${
                          ativo ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                        }`}>
                        <input type="checkbox" checked={ativo} onChange={() => toggle(atalho.id)}
                          className="w-4 h-4 accent-blue-600 shrink-0" />
                        <div className={`w-10 h-10 rounded-xl ${atalho.cor} text-white flex items-center justify-center text-xl shrink-0`}>
                          {atalho.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{atalho.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{atalho.desc}</div>
                        </div>
                        {ativo && (
                          <span className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                            Padrão
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Preview + Salvar */}
          <div className="space-y-5">

            {/* Preview */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm sticky top-24">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-200">
                <h2 className="font-bold text-gray-800 text-sm">📱 Preview da tela inicial</h2>
                <p className="text-xs text-gray-500 mt-0.5">Como aparece para o usuário padrão</p>
              </div>
              <div className="p-4">
                <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-4 max-w-[240px] mx-auto">
                  <div className="text-center mb-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-extrabold mx-auto mb-1 text-sm">U</div>
                    <div className="text-xs font-bold text-gray-800">Usuário</div>
                    <div className="text-xs text-green-600">✅ Válido</div>
                  </div>
                  <div className="space-y-1.5">
                    {previewAtivos.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-3">Nenhum atalho selecionado</p>
                    ) : previewAtivos.map(a => (
                      <div key={a.id} className={`${a.cor} text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5`}>
                        {a.emoji} {a.label}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100">
                    <div className="flex-1 text-center text-xs text-gray-500 border border-gray-200 rounded-lg py-1">⚙️ Personalizar</div>
                    <div className="flex-1 text-center text-xs text-red-500 border border-red-200 rounded-lg py-1">🚪 Sair</div>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button onClick={salvar} disabled={saving || loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition text-sm disabled:opacity-60">
                  {saving ? "Salvando..." : "Salvar como padrão"}
                </button>
                {saved && (
                  <div className="mt-3 text-center text-green-600 text-xs font-semibold bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    ✅ Padrão salvo com sucesso!
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center mt-3">
                  Usuários que já personalizaram o menu não serão afetados.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const { getServerSession } = require("next-auth/next");
  const { authOptions } = require("../api/auth/[...nextauth]");
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.email) {
    return { redirect: { destination: "/", permanent: false } };
  }

  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const r = await client.query("SELECT admin FROM usuarios WHERE email=$1", [session.user.email]);
    if (!r.rows[0]?.admin) {
      return { redirect: { destination: "/dashboard", permanent: false } };
    }
  } finally {
    client.release();
  }

  return { props: {} };
}
