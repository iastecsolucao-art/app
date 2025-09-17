import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const { data: session } = useSession();

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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-600 p-4 flex items-center justify-between shadow-lg">
      {/* Botão Home */}
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-white font-bold text-lg hover:underline">
          🏠 Home
        </Link>
      </div>

      {/* Desktop menu */}
      {session && !expirado && (
        <div className="hidden md:flex space-x-6 text-white items-center relative">
          <Link href="/dashboard" className="hover:underline text-yellow-300 font-semibold">
            Dashboard
          </Link>

          {/* Inventário */}
          <div className="relative group">
            <button className="hover:underline">Inventário ▾</button>
            <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg w-52">
              <Link href="/contagem" className="block px-4 py-2 hover:bg-gray-100">Contagem</Link>
              <Link href="/upload" className="block px-4 py-2 hover:bg-gray-100">Upload</Link>
              <Link href="/download" className="block px-4 py-2 hover:bg-gray-100">Download</Link>
              <Link href="/relatorios" className="block px-4 py-2 hover:bg-gray-100">Relatórios</Link>
            </div>
          </div>

          {/* Produtos */}
          <div className="relative group">
            <button className="hover:underline">Produtos ▾</button>
            <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg w-44">
              <Link href="/produtos" className="block px-4 py-2 hover:bg-gray-100">Cadastro Produto</Link>
              <Link href="/listar_produtos" className="block px-4 py-2 hover:bg-gray-100">Lista de Produtos</Link>
            </div>
          </div>

          {/* Compras */}
          <div className="relative group">
            <button className="hover:underline">Compras ▾</button>
            <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg w-44">
              <Link href="/compras" className="block px-4 py-2 hover:bg-gray-100">Nova Compra</Link>
              <Link href="/listar_compras" className="block px-4 py-2 hover:bg-gray-100">Lista de Compras</Link>
              <Link href="/entradas" className="block px-4 py-2 hover:bg-gray-100">Entradas</Link>
              <Link href="/estoque" className="block px-4 py-2 hover:bg-gray-100">Estoque</Link>
            </div>
          </div>

          {/* Comercial */}
          <div className="relative group">
            <button className="hover:underline">Comercial ▾</button>
            <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg w-44">
              <Link href="/orcamento" className="block px-4 py-2 hover:bg-gray-100">Orçamentos</Link>
              <Link href="/vendas" className="block px-4 py-2 hover:bg-gray-100">Vendas</Link>
            </div>
          </div>

          {/* Serviços (Agendamento) */}
          <div className="relative group">
            <button className="hover:underline">Serviços ▾</button>
            <div className="absolute hidden group-hover:block bg-white text-black mt-2 rounded shadow-lg w-40">
              <Link href="/agendamento" className="block px-4 py-2 hover:bg-gray-100">📅 Agendamento</Link>
            </div>
          </div>

          {/* Infos do usuário com badge */}
          <div className="ml-4 flex items-center space-x-2">
            <span className="text-sm text-gray-200">
              Bem-vindo, <strong>{session.user?.name}</strong>
            </span>
            {diasRestantes !== null && (
              <span
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  expirado
                    ? "bg-red-600 text-white"
                    : diasRestantes <= 5
                    ? "bg-yellow-400 text-black"
                    : "bg-green-600 text-white"
                }`}
              >
                {expirado
                  ? "Expirado"
                  : `Expira em ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`}
              </span>
            )}
          </div>

          {/* Botão logout */}
          <button
            onClick={() => signOut()}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-3"
          >
            Sair
          </button>
        </div>
      )}

      {/* Botão mobile ☰ */}
      {session && !expirado && (
        <button
          className="md:hidden text-white focus:outline-none text-xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      )}

      {/* Mobile menu */}
      {menuOpen && session && !expirado && (
        <div className="absolute top-full left-0 w-full bg-blue-700 flex flex-col text-white md:hidden z-50 shadow-lg pb-4">
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="px-4 py-2 border-b font-semibold text-yellow-300">
            Dashboard
          </Link>

          {/* Inventário */}
          <button onClick={() => toggleDropdown("inventario")} className="px-4 py-2 border-b text-left">Inventário ▾</button>
          {openDropdown === "inventario" && (
            <div className="bg-blue-800">
              <Link href="/contagem" className="block px-6 py-2 border-b">Contagem</Link>
              <Link href="/upload" className="block px-6 py-2 border-b">Upload</Link>
              <Link href="/download" className="block px-6 py-2 border-b">Download</Link>
              <Link href="/relatorios" className="block px-6 py-2 border-b">Relatórios</Link>
            </div>
          )}

          {/* Produtos */}
          <button onClick={() => toggleDropdown("produtos")} className="px-4 py-2 border-b text-left">Produtos ▾</button>
          {openDropdown === "produtos" && (
            <div className="bg-blue-800">
              <Link href="/produtos" className="block px-6 py-2 border-b">Cadastro Produto</Link>
              <Link href="/listar_produtos" className="block px-6 py-2 border-b">Lista de Produtos</Link>
            </div>
          )}

          {/* Compras */}
          <button onClick={() => toggleDropdown("compras")} className="px-4 py-2 border-b text-left">Compras ▾</button>
          {openDropdown === "compras" && (
            <div className="bg-blue-800">
              <Link href="/compras" className="block px-6 py-2 border-b">Nova Compra</Link>
              <Link href="/listar_compras" className="block px-6 py-2 border-b">Lista de Compras</Link>
              <Link href="/entradas" className="block px-6 py-2 border-b">Entradas</Link>
              <Link href="/estoque" className="block px-6 py-2 border-b">Estoque</Link>
            </div>
          )}

          {/* Comercial */}
          <button onClick={() => toggleDropdown("comercial")} className="px-4 py-2 border-b text-left">Comercial ▾</button>
          {openDropdown === "comercial" && (
            <div className="bg-blue-800">
              <Link href="/orcamento" className="block px-6 py-2 border-b">Orçamentos</Link>
              <Link href="/vendas" className="block px-6 py-2 border-b">Vendas</Link>
            </div>
          )}

          {/* Serviços (Agendamento) */}
          <button onClick={() => toggleDropdown("servicos")} className="px-4 py-2 border-b text-left">Serviços ▾</button>
          {openDropdown === "servicos" && (
            <div className="bg-blue-800">
              <Link href="/agendamento" onClick={() => setMenuOpen(false)} className="block px-6 py-2 border-b">📅 Agendamento</Link>
            </div>
          )}

          {/* Badge do usuário no mobile */}
          <div className="px-4 py-2 text-sm">
            👤 {session.user?.name}{" "}
            {diasRestantes !== null && (
              <span
                className={`ml-2 px-2 py-1 text-xs font-semibold rounded ${
                  expirado
                    ? "bg-red-600 text-white"
                    : diasRestantes <= 5
                    ? "bg-yellow-400 text-black"
                    : "bg-green-600 text-white"
                }`}
              >
                {expirado
                  ? "Expirado"
                  : `Expira em ${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`}
              </span>
            )}
          </div>

          {/* Sair */}
          <button onClick={() => { setMenuOpen(false); signOut(); }}
            className="mt-2 mx-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded">
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}