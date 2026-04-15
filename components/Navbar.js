import Link from "next/link";
import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [acessos, setAcessos] = useState(null);
  const [menusDin, setMenusDin] = useState([]);
  const [homeShortcuts, setHomeShortcuts] = useState(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/usuarios/acessos").then((res) => res.ok ? res.json() : {}),
      fetch("/api/menus").then((res) => res.ok ? res.json() : []),
      fetch("/api/usuarios/home-shortcuts").then((res) => res.ok ? res.json() : null)
    ])
    .then(([acessosData, menusData, shortcutsData]) => {
      if (cancelled) return;
      setAcessos(acessosData);
      setMenusDin(Array.isArray(menusData) ? menusData : []);
      setHomeShortcuts(shortcutsData?.shortcuts?.length > 0 ? shortcutsData.shortcuts : []);
    })
    .catch((err) => {
      if (!cancelled) console.error("Erro ao carregar dados do menu", err);
    });
    return () => { cancelled = true; };
  }, [session?.user?.email]);

  // Atualiza instantaneamente quando o usuário salva a personalização
  useEffect(() => {
    const handler = (e) => {
      setHomeShortcuts(e.detail ?? []);
    };
    window.addEventListener("shortcuts-updated", handler);
    return () => window.removeEventListener("shortcuts-updated", handler);
  }, []);

  let diasRestantes = null;
  if (session?.user?.expiracao) {
    const expDate = new Date(session.user.expiracao);
    const hoje = new Date();
    const diff = Math.ceil((expDate - hoje) / (1000 * 60 * 60 * 24));
    diasRestantes = diff;
  }

  const expirado = diasRestantes !== null && diasRestantes < 0;

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  useEffect(() => {
    setOpenDropdown(null);
    setMenuOpen(false);
  }, [router.asPath]);

  if (!session) return null;

  // Agrupa os menus retornados do banco por Módulo
  const menusPorModulo = {};
  menusDin.forEach(m => {
    if (!menusPorModulo[m.modulo]) menusPorModulo[m.modulo] = [];
    menusPorModulo[m.modulo].push(m);
  });

  // Módulos que o usuário quer ver (baseado nos home-shortcuts)
  // Enquanto carrega (null), mostra tudo; após carregar, filtra pelos escolhidos
  const modulosNavbar = ["dashboard","inventario","produtos","compras","comercial","servicos","buckman","relatorios","clientes","nfe","comissao","integracoes"];
  
  // homeShortcuts === null → ainda carregando → mostra tudo (evita piscar)
  // homeShortcuts === [] → carregou mas vazio → mostra tudo como fallback
  // homeShortcuts = [...] → filtra pelos ativos
  const modulosAtivos = (!homeShortcuts || homeShortcuts.length === 0)
    ? modulosNavbar
    : homeShortcuts.filter(id => modulosNavbar.includes(id));


  const isActive = (path) => router.pathname === path || router.asPath === path;
  const isBuckmanSection = router.asPath.startsWith("/buckman");

  const navLinkClass = (active = false) =>
    `hover:underline ${active ? "text-yellow-300 font-semibold" : "text-white"}`;

  const dropItemClass = (active = false) =>
    `block px-4 py-2 hover:bg-yellow-400 hover:text-black whitespace-nowrap ${active ? "bg-yellow-400 text-black font-semibold" : ""
    }`;

  const mobileItemClass = (active = false) =>
    `block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition whitespace-nowrap ${active ? "bg-yellow-400 text-black font-semibold" : ""
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-600 p-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-4">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className={navLinkClass(isActive("/")) + " font-bold text-lg"}
        >
          🏠 Home
        </Link>

        {acessos?.buckman && (
          <div className="ml-4 text-white font-bold text-xl select-none">
            BUCKMAN
          </div>
        )}
      </div>

      {!expirado && acessos && (
        <div className="hidden md:flex space-x-6 text-white items-center relative">
          {acessos.dashboard && modulosAtivos.includes('dashboard') && (
            <Link href="/dashboard" className={navLinkClass(isActive("/dashboard"))}>
              Dashboard
            </Link>
          )}

          {Object.keys(menusPorModulo).map((modulo) => (
            (acessos[modulo] !== false) && modulosAtivos.includes(modulo) && (
              <div className="relative" key={`desktop-${modulo}`}>
                <button
                  onClick={() => toggleDropdown(modulo)}
                  className={
                    navLinkClass((modulo === "buckman" && isBuckmanSection) || openDropdown === modulo) +
                    (modulo === "buckman" ? " whitespace-nowrap" : "")
                  }
                >
                  <span className="capitalize">{modulo}</span> ▾
                </button>
                {openDropdown === modulo && (
                  <div className={`absolute top-full ${modulo === 'servicos' || modulo === 'buckman' ? 'right-0' : 'left-0'} mt-1 bg-blue-700 rounded shadow-lg min-w-[200px] z-50 max-h-96 overflow-y-auto`}>
                    {menusPorModulo[modulo].map(item => (
                      <Link key={item.id} href={item.url} className={dropItemClass(isActive(item.url))}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          ))}

          {/* Botão Fixo de Planos para gerar receita SaaS */}
          <Link
            href="/admin/planos"
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full border border-yellow-400 bg-yellow-500/10 hover:bg-yellow-400 hover:text-black transition-colors ${isActive("/admin/planos") ? "bg-yellow-400 text-black" : "text-yellow-300 font-bold"}`}
          >
             Planos
          </Link>

          {acessos?.admin && (
            <Link
              href="/admin/agent-config"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full border border-blue-400 bg-blue-600/10 hover:bg-blue-600 hover:text-white transition-all ${isActive("/admin/agent-config") ? "bg-blue-600 text-white font-bold" : "text-blue-300 font-bold"}`}
              title="Configurar Agente de IA"
            >
               ✨ Agente IA
            </Link>
          )}
        </div>
      )}

      {session && !expirado && acessos && (
        <button
          className="md:hidden text-white focus:outline-none text-3xl"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      )}

      {menuOpen && session && !expirado && acessos && (
        <div className="fixed inset-0 bg-blue-700 text-white z-50 overflow-y-auto flex flex-col pt-20 pb-6">
          {acessos.dashboard && modulosAtivos.includes('dashboard') && (
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className={`px-6 py-3 border-b font-semibold ${isActive("/dashboard") ? "bg-yellow-400 text-black" : "text-yellow-300"
                }`}
            >
              Dashboard
            </Link>
          )}

          {Object.keys(menusPorModulo).map((modulo) => (
            (acessos[modulo] !== false) && modulosAtivos.includes(modulo) && (
              <React.Fragment key={`mobile-${modulo}`}>
                <button
                  onClick={() => toggleDropdown(modulo)}
                  className={`w-full text-left px-6 py-3 border-b flex justify-between items-center ${modulo === 'buckman' && isBuckmanSection ? 'text-yellow-300 font-semibold' : ''}`}
                >
                  <span className="capitalize">{modulo}</span> ▾ <span>{openDropdown === modulo ? "▲" : "▼"}</span>
                </button>
                {openDropdown === modulo && (
                  <div className="bg-blue-800">
                    {menusPorModulo[modulo].map(item => (
                      <Link
                        key={item.id}
                        href={item.url}
                        onClick={() => setMenuOpen(false)}
                        className={mobileItemClass(isActive(item.url))}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </React.Fragment>
            )
          ))}

          <Link
            href="/admin/planos"
            onClick={() => setMenuOpen(false)}
            className={`px-6 py-4 border-b font-bold flex items-center gap-2 ${isActive("/admin/planos") ? "bg-yellow-400 text-black" : "text-yellow-300 bg-yellow-500/10"}`}
          >
            🚀 Atualizar Plano SaaS
          </Link>

          <div className="px-6 py-4 text-sm border-t border-blue-600">
            👤 {session.user?.name} <br />
            🏢 {session.user?.empresa_nome}
          </div>

          {acessos?.admin && (
            <Link
              href="/admin/agent-config"
              onClick={() => setMenuOpen(false)}
              className="mx-6 p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-center font-bold shadow-md"
            >
              ✨ Configurar Agente IA
            </Link>
          )}

          <button
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
            className="mx-6 mt-4 mb-6 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded"
          >
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}