import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";

export default function Navbar() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [acessos, setAcessos] = useState(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      fetch("/api/usuarios/acessos")
        .then((res) => res.json())
        .then((data) => setAcessos(data))
        .catch((err) => console.error("Erro ao carregar acessos", err));
    }
  }, [session]);

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

  const isActive = (path) => router.pathname === path || router.asPath === path;
  const isBuckmanSection = router.asPath.startsWith("/buckman");

  const navLinkClass = (active = false) =>
    `hover:underline ${active ? "text-yellow-300 font-semibold" : "text-white"}`;

  const dropItemClass = (active = false) =>
    `block px-4 py-2 hover:bg-yellow-400 hover:text-black whitespace-nowrap ${
      active ? "bg-yellow-400 text-black font-semibold" : ""
    }`;

  const mobileItemClass = (active = false) =>
    `block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition whitespace-nowrap ${
      active ? "bg-yellow-400 text-black font-semibold" : ""
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
          {acessos.dashboard && (
            <Link href="/dashboard" className={navLinkClass(isActive("/dashboard"))}>
              Dashboard
            </Link>
          )}

          {acessos.inventario && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("inventario")}
                className={navLinkClass(openDropdown === "inventario")}
              >
                Inventário ▾
              </button>
              {openDropdown === "inventario" && (
                <div className="absolute top-full left-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[150px] z-50">
                  <Link href="/contagem" className={dropItemClass(isActive("/contagem"))}>
                    Contagem
                  </Link>
                  <Link href="/upload" className={dropItemClass(isActive("/upload"))}>
                    Upload
                  </Link>
                  <Link href="/download" className={dropItemClass(isActive("/download"))}>
                    Download
                  </Link>
                  <Link href="/relatorios" className={dropItemClass(isActive("/relatorios"))}>
                    Relatórios
                  </Link>
                </div>
              )}
            </div>
          )}

          {acessos.produtos && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("produtos")}
                className={navLinkClass(openDropdown === "produtos")}
              >
                Produtos ▾
              </button>
              {openDropdown === "produtos" && (
                <div className="absolute top-full left-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[150px] z-50">
                  <Link href="/produtos" className={dropItemClass(isActive("/produtos"))}>
                    Cadastro Produto
                  </Link>
                  <Link
                    href="/listar_produtos"
                    className={dropItemClass(isActive("/listar_produtos"))}
                  >
                    Lista de Produtos
                  </Link>
                </div>
              )}
            </div>
          )}

          {acessos.compras && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("compras")}
                className={navLinkClass(openDropdown === "compras")}
              >
                Compras ▾
              </button>
              {openDropdown === "compras" && (
                <div className="absolute top-full left-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[150px] z-50">
                  <Link href="/compras" className={dropItemClass(isActive("/compras"))}>
                    Nova Compra
                  </Link>
                  <Link
                    href="/listar_compras"
                    className={dropItemClass(isActive("/listar_compras"))}
                  >
                    Lista de Compras
                  </Link>
                  <Link href="/entradas" className={dropItemClass(isActive("/entradas"))}>
                    Entradas
                  </Link>
                  <Link href="/estoque" className={dropItemClass(isActive("/estoque"))}>
                    Estoque
                  </Link>
                </div>
              )}
            </div>
          )}

          {acessos.comercial && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("comercial")}
                className={navLinkClass(openDropdown === "comercial")}
              >
                Comercial ▾
              </button>
              {openDropdown === "comercial" && (
                <div className="absolute top-full left-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[150px] z-50">
                  <Link href="/orcamento" className={dropItemClass(isActive("/orcamento"))}>
                    Orçamentos
                  </Link>
                  <Link href="/vendas" className={dropItemClass(isActive("/vendas"))}>
                    Vendas
                  </Link>
                </div>
              )}
            </div>
          )}

          {acessos.servicos && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("servicos")}
                className={navLinkClass(openDropdown === "servicos")}
              >
                Serviços ▾
              </button>
              {openDropdown === "servicos" && (
                <div className="absolute top-full right-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[180px] z-50">
                  <Link href="/agendamento" className={dropItemClass(isActive("/agendamento"))}>
                    📅 Agendamento
                  </Link>
                  <Link href="/servicos" className={dropItemClass(isActive("/servicos"))}>
                    ⚙️ Serviços
                  </Link>
                  <Link href="/produtos" className={dropItemClass(isActive("/produtos"))}>
                    ⚙️ Produtos
                  </Link>
                  <Link href="/profissionais" className={dropItemClass(isActive("/profissionais"))}>
                    👩‍⚕️ Profissionais
                  </Link>
                  <Link
                    href="/profissionais-horarios"
                    className={dropItemClass(isActive("/profissionais-horarios"))}
                  >
                    🕒 Horários dos Profissionais
                  </Link>
                  <Link href="/clientes" className={dropItemClass(isActive("/clientes"))}>
                    👤 Clientes
                  </Link>
                  <Link href="/faturas" className={dropItemClass(isActive("/faturas"))}>
                    💳 Faturas
                  </Link>
                  <Link
                    href="/dashboard_servico"
                    className={dropItemClass(isActive("/dashboard_servico"))}
                  >
                    📊 Dashboard
                  </Link>
                  <Link
                    href="/agendamentos/completar"
                    className={dropItemClass(isActive("/agendamentos/completar"))}
                  >
                    📝 Completar Agendamentos
                  </Link>
                </div>
              )}
            </div>
          )}

          {acessos.buckman && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("buckman")}
                className={
                  navLinkClass(isBuckmanSection || openDropdown === "buckman") +
                  " whitespace-nowrap"
                }
              >
                Buckman ▾
              </button>

              {openDropdown === "buckman" && (
                <div className="absolute top-full right-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[240px] z-50">
                  <Link
                    href="/buckman/vendedores"
                    className={dropItemClass(isActive("/buckman/vendedores"))}
                  >
                    Vendedores
                  </Link>

                  <Link
                    href="/calendario_loja"
                    className={dropItemClass(isActive("/calendario_loja"))}
                  >
                    Calendário Loja
                  </Link>

                  <Link
                    href="/buckman/calendario"
                    className={dropItemClass(isActive("/buckman/calendario"))}
                  >
                    Calendário
                  </Link>

                  <Link
                    href="/buckman/nfe"
                    className={dropItemClass(isActive("/buckman/nfe"))}
                  >
                    🧾 NF-e (Importar XML)
                  </Link>

                  <Link
                    href="/buckman/participantes"
                    className={dropItemClass(isActive("/buckman/participantes"))}
                  >
                    👥 Participantes
                  </Link>

                  <Link
                    href="/relatorio_semanal_dinamico"
                    className={dropItemClass(isActive("/relatorio_semanal_dinamico"))}
                  >
                    Relatório Semanal
                  </Link>

                  <Link
                    href="/relatorio_mensal_vendedor_comissao"
                    className={dropItemClass(isActive("/relatorio_mensal_vendedor_comissao"))}
                  >
                    Relatório Mensal por Vendedor
                  </Link>
                </div>
              )}
            </div>
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
          {acessos.dashboard && (
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className={`px-6 py-3 border-b font-semibold ${
                isActive("/dashboard") ? "bg-yellow-400 text-black" : "text-yellow-300"
              }`}
            >
              Dashboard
            </Link>
          )}

          {acessos.inventario && (
            <>
              <button
                onClick={() => toggleDropdown("inventario")}
                className="w-full text-left px-6 py-3 border-b flex justify-between items-center"
              >
                Inventário ▾ <span>{openDropdown === "inventario" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "inventario" && (
                <div className="bg-blue-800">
                  <Link
                    href="/contagem"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/contagem"))}
                  >
                    Contagem
                  </Link>
                  <Link
                    href="/upload"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/upload"))}
                  >
                    Upload
                  </Link>
                  <Link
                    href="/download"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/download"))}
                  >
                    Download
                  </Link>
                  <Link
                    href="/relatorios"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/relatorios"))}
                  >
                    Relatórios
                  </Link>
                </div>
              )}
            </>
          )}

          {acessos.produtos && (
            <>
              <button
                onClick={() => toggleDropdown("produtos")}
                className="w-full text-left px-6 py-3 border-b flex justify-between items-center"
              >
                Produtos ▾ <span>{openDropdown === "produtos" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "produtos" && (
                <div className="bg-blue-800">
                  <Link
                    href="/produtos"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/produtos"))}
                  >
                    Cadastro Produto
                  </Link>
                  <Link
                    href="/listar_produtos"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/listar_produtos"))}
                  >
                    Lista de Produtos
                  </Link>
                </div>
              )}
            </>
          )}

          {acessos.compras && (
            <>
              <button
                onClick={() => toggleDropdown("compras")}
                className="w-full text-left px-6 py-3 border-b flex justify-between items-center"
              >
                Compras ▾ <span>{openDropdown === "compras" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "compras" && (
                <div className="bg-blue-800">
                  <Link
                    href="/compras"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/compras"))}
                  >
                    Nova Compra
                  </Link>
                  <Link
                    href="/listar_compras"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/listar_compras"))}
                  >
                    Lista de Compras
                  </Link>
                  <Link
                    href="/entradas"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/entradas"))}
                  >
                    Entradas
                  </Link>
                  <Link
                    href="/estoque"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/estoque"))}
                  >
                    Estoque
                  </Link>
                </div>
              )}
            </>
          )}

          {acessos.comercial && (
            <>
              <button
                onClick={() => toggleDropdown("comercial")}
                className="w-full text-left px-6 py-3 border-b flex justify-between items-center"
              >
                Comercial ▾ <span>{openDropdown === "comercial" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "comercial" && (
                <div className="bg-blue-800">
                  <Link
                    href="/orcamento"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/orcamento"))}
                  >
                    Orçamentos
                  </Link>
                  <Link
                    href="/vendas"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/vendas"))}
                  >
                    Vendas
                  </Link>
                </div>
              )}
            </>
          )}

          {acessos.servicos && (
            <>
              <button
                onClick={() => toggleDropdown("servicos")}
                className="w-full text-left px-6 py-3 border-b flex justify-between items-center"
              >
                Serviços ▾ <span>{openDropdown === "servicos" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "servicos" && (
                <div className="bg-blue-800">
                  <Link
                    href="/agendamento"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/agendamento"))}
                  >
                    📅 Agendamento
                  </Link>
                  <Link
                    href="/servicos"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/servicos"))}
                  >
                    ⚙️ Serviços
                  </Link>
                  <Link
                    href="/produtos"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/produtos"))}
                  >
                    ⚙️ Produtos
                  </Link>
                  <Link
                    href="/profissionais"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/profissionais"))}
                  >
                    👩‍⚕️ Profissionais
                  </Link>
                  <Link
                    href="/profissionais-horarios"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/profissionais-horarios"))}
                  >
                    🕒 Horários dos Profissionais
                  </Link>
                  <Link
                    href="/clientes"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/clientes"))}
                  >
                    👤 Clientes
                  </Link>
                  <Link
                    href="/faturas"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/faturas"))}
                  >
                    💳 Faturas
                  </Link>
                  <Link
                    href="/dashboard_servico"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/dashboard_servico"))}
                  >
                    📊 Dashboard
                  </Link>
                  <Link
                    href="/agendamentos/completar"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/agendamentos/completar"))}
                  >
                    📝 Completar Agendamentos
                  </Link>
                </div>
              )}
            </>
          )}

          {acessos.buckman && (
            <>
              <button
                onClick={() => toggleDropdown("buckman")}
                className={`w-full text-left px-6 py-3 border-b flex justify-between items-center ${
                  isBuckmanSection ? "text-yellow-300 font-semibold" : ""
                }`}
              >
                Buckman ▾ <span>{openDropdown === "buckman" ? "▲" : "▼"}</span>
              </button>

              {openDropdown === "buckman" && (
                <div className="bg-blue-800">
                  <Link
                    href="/buckman/vendedores"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/buckman/vendedores"))}
                  >
                    Vendedores
                  </Link>

                  <Link
                    href="/buckman/meta_loja"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/buckman/meta_loja"))}
                  >
                    Metas Loja
                  </Link>

                  <Link
                    href="/calendario_loja"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/calendario_loja"))}
                  >
                    Calendário Loja
                  </Link>

                  <Link
                    href="/buckman/calendario"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/buckman/calendario"))}
                  >
                    Calendário
                  </Link>

                  <Link
                    href="/buckman/nfe"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/buckman/nfe"))}
                  >
                    🧾 NF-e (Importar XML)
                  </Link>

                  <Link
                    href="/buckman/participantes"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/buckman/participantes"))}
                  >
                    👥 Participantes
                  </Link>

                  <Link
                    href="/relatorio_semanal_dinamico"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/relatorio_semanal_dinamico"))}
                  >
                    Relatório Semanal
                  </Link>

                  <Link
                    href="/relatorio_mensal_vendedor_comissao"
                    onClick={() => setMenuOpen(false)}
                    className={mobileItemClass(isActive("/relatorio_mensal_vendedor_comissao"))}
                  >
                    Relatório Mensal por Vendedor
                  </Link>
                </div>
              )}
            </>
          )}

          <div className="px-6 py-4 text-sm border-t border-blue-600">
            👤 {session.user?.name} <br />
            🏢 {session.user?.empresa_nome}
          </div>

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