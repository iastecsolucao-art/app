import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [acessos, setAcessos] = useState(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      fetch("/api/usuarios/acessos")
        .then((res) => res.json())
        .then((data) => {
          console.log("Acessos do usuário:", data);
          setAcessos(data);
        })
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

  if (!session) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-600 p-4 flex items-center justify-between shadow-lg">
      {/* Botão Home */}
      <div className="flex items-center space-x-4">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="text-white font-bold text-lg hover:underline"
        >
          🏠 Home
        </Link>

        {/* Logo Buckman - só se tiver acesso */}
        {acessos?.buckman && (
          <div className="ml-4 text-white font-bold text-xl select-none">
            BUCKMAN
          </div>
        )}
      </div>

      {/* --- DESKTOP --- */}
      {!expirado && acessos && (
        <div className="hidden md:flex space-x-6 text-white items-center relative">
          {/* Dashboard */}
          {acessos.dashboard && (
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
          )}

          {/* Inventário */}
          {acessos.inventario && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("inventario")}
                className="hover:underline focus:outline-none"
              >
                Inventário ▾
              </button>
              {openDropdown === "inventario" && (
                <div className="absolute top-full left-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[150px] z-50">
                  <Link
                    href="/contagem"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Contagem
                  </Link>
                  <Link
                    href="/upload"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Upload
                  </Link>
                  <Link
                    href="/download"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Download
                  </Link>
                  <Link
                    href="/relatorios"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Relatórios
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Produtos */}
          {acessos.produtos && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("produtos")}
                className="hover:underline focus:outline-none"
              >
                Produtos ▾
              </button>
              {openDropdown === "produtos" && (
                <div className="absolute top-full left-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[150px] z-50">
                  <Link
                    href="/produtos"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Cadastro Produto
                  </Link>
                  <Link
                    href="/listar_produtos"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Lista de Produtos
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Compras */}
          {acessos.compras && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("compras")}
                className="hover:underline focus:outline-none"
              >
                Compras ▾
              </button>
              {openDropdown === "compras" && (
                <div className="absolute top-full left-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[150px] z-50">
                  <Link
                    href="/compras"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Nova Compra
                  </Link>
                  <Link
                    href="/listar_compras"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Lista de Compras
                  </Link>
                  <Link
                    href="/entradas"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Entradas
                  </Link>
                  <Link
                    href="/estoque"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Estoque
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Comercial */}
          {acessos.comercial && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("comercial")}
                className="hover:underline focus:outline-none"
              >
                Comercial ▾
              </button>
              {openDropdown === "comercial" && (
                <div className="absolute top-full left-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[150px] z-50">
                  <Link
                    href="/orcamento"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Orçamentos
                  </Link>
                  <Link
                    href="/vendas"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    Vendas
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Serviços */}
          {acessos.servicos && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("servicos")}
                className="hover:underline focus:outline-none"
              >
                Serviços ▾
              </button>
              {openDropdown === "servicos" && (
                <div className="absolute top-full right-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[180px] z-50">
                  <Link
                    href="/agendamento"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    📅 Agendamento
                  </Link>
                  <Link
                    href="/servicos"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    ⚙️ Serviços
                  </Link>
                  <Link
                    href="/produtos"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    ⚙️ Produtos
                  </Link>
                  <Link
                    href="/profissionais"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    👩‍⚕️ Profissionais
                  </Link>
                  <Link
                    href="/profissionais-horarios"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    🕒 Horários dos Profissionais
                  </Link>
                  <Link
                    href="/clientes"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    👤 Clientes
                  </Link>
                  <Link
                    href="/faturas"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    💳 Faturas
                  </Link>
                  <Link
                    href="/dashboard_servico"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    📊 Dashboard
                  </Link>
                  <Link
                    href="/agendamentos/completar"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black"
                  >
                    📝 Completar Agendamentos
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Buckman - só se tiver acesso */}
          {acessos.buckman && (
            <div className="relative">
              <button
                onClick={() => toggleDropdown("buckman")}
                className="hover:underline focus:outline-none whitespace-nowrap"
              >
                Buckman ▾
              </button>
              {openDropdown === "buckman" && (
                <div className="absolute top-full right-0 mt-1 bg-blue-700 rounded shadow-lg min-w-[200px] z-50">
                  <Link
                    href="/buckman/vendedores"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black whitespace-nowrap"
                  >
                    Vendedores
                
                  </Link>

                  {/* NOVO ITEM */}
                  <Link
                    href="/calendario_loja"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black whitespace-nowrap"
                  >
                    Calendário Loja
                  </Link>

                  <Link
                    href="/buckman/calendario"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black whitespace-nowrap"
                  >
                    Calendário
                  </Link>
                  <Link
                    href="/relatorio_semanal_dinamico"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black whitespace-nowrap"
                  >
                    Relatório Semanal
                  </Link>
                  <Link
                    href="/relatorio_mensal_vendedor_comissao"
                    className="block px-4 py-2 hover:bg-yellow-400 hover:text-black whitespace-nowrap"
                  >
                    Relatório Mensal por Vendedor
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- BOTÃO MOBILE ☰ --- */}
      {session && !expirado && acessos && (
        <button
          className="md:hidden text-white focus:outline-none text-3xl"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      )}

      {/* --- MOBILE MENU --- */}
      {menuOpen && session && !expirado && acessos && (
        <div className="fixed inset-0 bg-blue-700 text-white z-50 overflow-y-auto flex flex-col pt-20 pb-6">
          {acessos.dashboard && (
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="px-6 py-3 border-b font-semibold text-yellow-300"
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
                Inventário ▾
                <span>{openDropdown === "inventario" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "inventario" && (
                <div className="bg-blue-800">
                  <Link
                    href="/contagem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    Contagem
                  </Link>
                  <Link
                    href="/upload"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    Upload
                  </Link>
                  <Link
                    href="/download"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    Download
                  </Link>
                  <Link
                    href="/relatorios"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
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
                Produtos ▾
                <span>{openDropdown === "produtos" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "produtos" && (
                <div className="bg-blue-800">
                  <Link
                    href="/produtos"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    Cadastro Produto
                  </Link>
                  <Link
                    href="/listar_produtos"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
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
                Compras ▾
                <span>{openDropdown === "compras" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "compras" && (
                <div className="bg-blue-800">
                  <Link
                    href="/compras"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    Nova Compra
                  </Link>
                  <Link
                    href="/listar_compras"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    Lista de Compras
                  </Link>
                  <Link
                    href="/entradas"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    Entradas
                  </Link>
                  <Link
                    href="/estoque"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
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
                Comercial ▾
                <span>{openDropdown === "comercial" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "comercial" && (
                <div className="bg-blue-800">
                  <Link
                    href="/orcamento"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    Orçamentos
                  </Link>
                  <Link
                    href="/vendas"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
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
                Serviços ▾
                <span>{openDropdown === "servicos" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "servicos" && (
                <div className="bg-blue-800">
                  <Link
                    href="/agendamento"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    📅 Agendamento
                  </Link>
                  <Link
                    href="/servicos"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    ⚙️ Serviços
                  </Link>
                  <Link
                    href="/produtos"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    ⚙️ Produtos
                  </Link>
                  <Link
                    href="/profissionais"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    👩‍⚕️ Profissionais
                  </Link>
                  <Link
                    href="/profissionais-horarios"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    🕒 Horários dos Profissionais
                  </Link>
                  <Link
                    href="/clientes"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    👤 Clientes
                  </Link>
                  <Link
                    href="/faturas"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    💳 Faturas
                  </Link>
                  <Link
                    href="/dashboard_servico"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    📊 Dashboard
                  </Link>
                  <Link
                    href="/agendamentos/completar"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition"
                  >
                    📝 Completar Agendamentos
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Buckman Mobile */}
          {acessos.buckman && (
            <>
              <button
                onClick={() => toggleDropdown("buckman")}
                className="w-full text-left px-6 py-3 border-b flex justify-between items-center"
              >
                Buckman ▾
                <span>{openDropdown === "buckman" ? "▲" : "▼"}</span>
              </button>
              {openDropdown === "buckman" && (
                <div className="bg-blue-800">
                  <Link
                    href="/buckman/vendedores"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition whitespace-nowrap"
                  >
                    Vendedores
                  </Link>
                  <Link
                    href="/buckman/meta_loja"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition whitespace-nowrap"
                  >
                    Metas Loja
                  </Link>

                  {/* NOVO ITEM MOBILE */}
                  <Link
                    href="/calendario_loja"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition whitespace-nowrap"
                  >
                    Calendário Loja
                  </Link>

                  <Link
                    href="/buckman/calendario"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition whitespace-nowrap"
                  >
                    Calendário
                  </Link>
                  <Link
                    href="/relatorio_semanal_dinamico"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition whitespace-nowrap"
                  >
                    Relatório Semanal
                  </Link>
                  <Link
                    href="/relatorio_mensal_vendedor_comissao"
                    onClick={() => setMenuOpen(false)}
                    className="block px-8 py-2 border-b hover:bg-yellow-400 hover:text-black transition whitespace-nowrap"
                  >
                    Relatório Mensal por Vendedor
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Infos usuário */}
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
