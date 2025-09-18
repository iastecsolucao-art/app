import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [acessos, setAcessos] = useState(null);
  const { data: session } = useSession();

  // carregar acessos do usuário
  useEffect(() => {
    if (session) {
      fetch("/api/usuarios/acessos")
        .then(res => res.json())
        .then(setAcessos)
        .catch(err => console.error("Erro ao carregar acessos", err));
    }
  }, [session]);

  // 🔹 Calcular dias de expiração
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

  // se não tem sessão ou acessos carregados ainda
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
      </div>

      {/* --- DESKTOP --- */}
      {!expirado && acessos && (
        <div className="hidden md:flex space-x-6 text-white items-center relative">

          {acessos.dashboard && (
            <Link href="/dashboard" className="hover:underline text-yellow-300 font-semibold">
              Dashboard
            </Link>
          )}

          {acessos.inventario && (
            <div className="relative group">
              <button className="hover:underline">Inventário ▾</button>
              <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg w-52">
                <Link href="/contagem" className="block px-4 py-2 hover:bg-gray-100">Contagem</Link>
                <Link href="/upload" className="block px-4 py-2 hover:bg-gray-100">Upload</Link>
                <Link href="/download" className="block px-4 py-2 hover:bg-gray-100">Download</Link>
                <Link href="/relatorios" className="block px-4 py-2 hover:bg-gray-100">Relatórios</Link>
              </div>
            </div>
          )}

          {acessos.produtos && (
            <div className="relative group">
              <button className="hover:underline">Produtos ▾</button>
              <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg w-44">
                <Link href="/produtos" className="block px-4 py-2 hover:bg-gray-100">Cadastro Produto</Link>
                <Link href="/listar_produtos" className="block px-4 py-2 hover:bg-gray-100">Lista de Produtos</Link>
              </div>
            </div>
          )}

          {acessos.compras && (
            <div className="relative group">
              <button className="hover:underline">Compras ▾</button>
              <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg w-44">
                <Link href="/compras" className="block px-4 py-2 hover:bg-gray-100">Nova Compra</Link>
                <Link href="/listar_compras" className="block px-4 py-2 hover:bg-gray-100">Lista de Compras</Link>
                <Link href="/entradas" className="block px-4 py-2 hover:bg-gray-100">Entradas</Link>
                <Link href="/estoque" className="block px-4 py-2 hover:bg-gray-100">Estoque</Link>
              </div>
            </div>
          )}

          {acessos.comercial && (
            <div className="relative group">
              <button className="hover:underline">Comercial ▾</button>
              <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg w-44">
                <Link href="/orcamento" className="block px-4 py-2 hover:bg-gray-100">Orçamentos</Link>
                <Link href="/vendas" className="block px-4 py-2 hover:bg-gray-100">Vendas</Link>
              </div>
            </div>
          )}

          {acessos.servicos && (
            <div className="relative group">
              <button className="hover:underline">Serviços ▾</button>
              <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg w-48">
                <Link href="/agendamento" className="block px-4 py-2 hover:bg-gray-100">📅 Agendamento</Link>
                <Link href="/servicos" className="block px-4 py-2 hover:bg-gray-100">⚙️ Serviços</Link>
                <Link href="/profissionais" className="block px-4 py-2 hover:bg-gray-100">👩‍⚕️ Profissionais</Link>
                <Link href="/clientes" className="block px-4 py-2 hover:bg-gray-100">👤 Clientes</Link>
                <Link href="/faturas" className="block px-4 py-2 hover:bg-gray-100">� Faturas</Link>

<Link href="/dashboard_servico" className="dropdown-item">📊 Dashboard</Link>

              </div>
            </div>
          )}

          {/* Infos do usuário */}
          <div className="ml-4 flex items-center space-x-2">
            <span className="text-sm text-gray-200">
              Bem-vindo, <strong>{session.user?.name}</strong><br />
              Empresa: <strong>{session.user?.empresa}</strong>
            </span>
          </div>
          <button onClick={() => signOut()} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-3">Sair</button>
        </div>
      )}

      {/* --- BOTÃO MOBILE ☰ --- */}
      {session && !expirado && acessos && (
        <button
          className="md:hidden text-white focus:outline-none text-xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      )}

      {/* --- MOBILE MENU --- */}
      {menuOpen && session && !expirado && acessos && (
        <div className="absolute top-full left-0 w-full bg-blue-700 flex flex-col text-white md:hidden z-50 shadow-lg pb-4">
          {acessos.dashboard && (
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="px-4 py-2 border-b font-semibold text-yellow-300">
              Dashboard
            </Link>
          )}

          {acessos.inventario && (
            <>
              <button onClick={() => toggleDropdown("inventario")} className="px-4 py-2 border-b text-left">Inventário ▾</button>
              {openDropdown === "inventario" && (
                <div className="bg-blue-800">
                  <Link href="/contagem" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Contagem</Link>
                  <Link href="/upload" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Upload</Link>
                  <Link href="/download" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Download</Link>
                  <Link href="/relatorios" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Relatórios</Link>
                </div>
              )}
            </>
          )}

          {acessos.produtos && (
            <>
              <button onClick={() => toggleDropdown("produtos")} className="px-4 py-2 border-b text-left">Produtos ▾</button>
              {openDropdown === "produtos" && (
                <div className="bg-blue-800">
                  <Link href="/produtos" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Cadastro Produto</Link>
                  <Link href="/listar_produtos" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Lista de Produtos</Link>
                </div>
              )}
            </>
          )}

          {acessos.compras && (
            <>
              <button onClick={() => toggleDropdown("compras")} className="px-4 py-2 border-b text-left">Compras ▾</button>
              {openDropdown === "compras" && (
                <div className="bg-blue-800">
                  <Link href="/compras" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Nova Compra</Link>
                  <Link href="/listar_compras" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Lista de Compras</Link>
                  <Link href="/entradas" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Entradas</Link>
                  <Link href="/estoque" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Estoque</Link>
                </div>
              )}
            </>
          )}

          {acessos.comercial && (
            <>
              <button onClick={() => toggleDropdown("comercial")} className="px-4 py-2 border-b text-left">Comercial ▾</button>
              {openDropdown === "comercial" && (
                <div className="bg-blue-800">
                  <Link href="/orcamento" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Orçamentos</Link>
                  <Link href="/vendas" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">Vendas</Link>
                </div>
              )}
            </>
          )}

          {acessos.servicos && (
            <>
              <button onClick={() => toggleDropdown("servicos")} className="px-4 py-2 border-b text-left">Serviços ▾</button>
              {openDropdown === "servicos" && (
                <div className="bg-blue-800">
                  <Link href="/agendamento" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">📅 Agendamento</Link>
                  <Link href="/servicos" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">⚙️ Serviços</Link>
                  <Link href="/profissionais" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">👩‍⚕️ Profissionais</Link>
                  <Link href="/clientes" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">👤 Clientes</Link>
                <Link href="/faturas" className="block px-4 py-2 hover:bg-gray-100">� Faturas</Link>

<Link href="/dashboard_servico" className="dropdown-item">📊 Dashboard</Link>

                </div>
              )}
            </>
          )}

          {/* Infos usuário */}
          <div className="px-4 py-2 text-sm">
            👤 {session.user?.name} <br />
            🏢 {session.user?.empresa}
          </div>

          <button onClick={() => { setMenuOpen(false); signOut(); }}
            className="mt-2 mx-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded">
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}