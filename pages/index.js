import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();
  const [acessos, setAcessos] = useState(null);

  useEffect(() => {
    if (session) {
      fetch("/api/usuarios/acessos")
        .then(res => res.json())
        .then(setAcessos)
        .catch(err => console.error("Erro ao carregar acessos:", err));
    }
  }, [session]);

  function formatDate(dateString) {
    if (!dateString) return null;
    const d = new Date(dateString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
  }

  const expirado = session?.user?.expiracao && new Date(session.user.expiracao) < new Date();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <main className="flex flex-col flex-1 items-center justify-center text-center px-6">

        {!session ? (
          // 🔹 Tela login (igual já estava)
          <div> ... </div>
        ) : (
          // 🔹 Tela logado com ícones dinâmicos
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 max-w-xl w-full">
            <h2 className="text-2xl font-bold mb-4">
              👋 Bem-vindo, {session.user?.name}
              <p>Empresa: {session.user?.empresa}</p>
            </h2>

            {session.user?.expiracao && (
              <p className="text-gray-600 mb-4">
                Expira em: {formatDate(session.user.expiracao)}
              </p>
            )}

            {/* Mensagem role */}
            {session.user?.role === "trial" ? (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                🚀 Você está usando a <b>versão de teste (1 dia)</b>.<br />
                👉 Para continuar após expirar, entre com sua conta Google.
              </div>
            ) : (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                ✅ Seu acesso via <b>Google</b> é válido por <b>10 dias</b>.
              </div>
            )}

            {/* 🔹 Botões dinâmicos conforme acessos */}
            <div className="space-y-3">
              {acessos?.dashboard && (
                <Link
                  href="/dashboard"
                  className="block bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded"
                >
                  📊 Acessar Dashboard
                </Link>
              )}

              {acessos?.inventario && (
                <Link
                  href="/contagem"
                  className="block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
                >
                  📦 Inventário
                </Link>
              )}

              {acessos?.produtos && (
                <Link
                  href="/produtos"
                  className="block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
                >
                  🛒 Produtos
                </Link>
              )}

              {acessos?.compras && (
                <Link
                  href="/compras"
                  className="block bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded"
                >
                  💰 Compras
                </Link>
              )}

              {acessos?.comercial && (
                <Link
                  href="/orcamento"
                  className="block bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded"
                >
                  📑 Comercial
                </Link>
              )}

              {acessos?.servicos && (
                <Link
                  href="/servicos"
                  className="block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded"
                >
                  ⚙️ Serviços
                </Link>
              )}

              {session.user?.role === "admin" && (
                <>
                  <Link
                    href="/usuarios"
                    className="block bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded"
                  >
                    👥 Gestão de Usuários
                  </Link>
                  <Link
                    href="/acessos"
                    className="block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded"
                  >
                    🔐 Gestão de Acessos
                  </Link>
                </>
              )}
            </div>

            {/* Botão sair */}
            <button
              onClick={() => signOut()}
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
    </div>
  );
}