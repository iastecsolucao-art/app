import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [trialMode, setTrialMode] = useState(false);
  const [trialNome, setTrialNome] = useState("");
  const [trialEmail, setTrialEmail] = useState("");
  const [acessos, setAcessos] = useState(null);

  // Buscar acessos do usuário logado
  useEffect(() => {
    if (session) {
      fetch("/api/usuarios/acessos")
        .then((res) => res.json())
        .then(setAcessos)
        .catch((err) => console.error("Erro ao carregar acessos:", err));
    }
  }, [session]);

  // Login manual
  async function handleCredLogin(e) {
    e.preventDefault();
    await signIn("credentials", {
      email,
      senha,
      redirect: true,
      callbackUrl: "/",
    });
  }

  // Ativar Trial
  async function handleTrialAccess(e) {
    e.preventDefault();
    const res = await fetch("/api/free-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: trialNome, email: trialEmail }),
    });

    if (res.ok) {
      await signIn("credentials", {
        email: trialEmail,
        senha: "trial",
        redirect: true,
        callbackUrl: "/",
      });
    } else {
      alert("Erro ao iniciar teste gratuito.");
    }
  }

  // Format Date
  function formatDate(dateString) {
    if (!dateString) return null;
    const d = new Date(dateString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // Calcula dias restantes para expiração
  const diasRestantes = session?.user?.expiracao
    ? Math.ceil(
        (new Date(session.user.expiracao) - new Date()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const expirado = diasRestantes !== null && diasRestantes < 0;

  // Se sessão ainda carregando → evita tela "..."
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
          // Tela login
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              Bem-vindo ao <span className="text-blue-600">App IasTec</span>
            </h2>
            <p className="text-gray-600 mb-4">Escolha uma forma de acesso</p>

            {!trialMode ? (
              <>
                {/* Google */}
                <button
                  onClick={() => signIn("google")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded w-full mb-4"
                >
                  Entrar com Google
                </button>

                {/* Credenciais */}
                <form onSubmit={handleCredLogin} className="space-y-3 mb-4">
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

                {/* Trial */}
                <button
                  onClick={() => setTrialMode(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded w-full"
                >
                  🚀 Testar por 1 dia grátis
                </button>
              </>
            ) : (
              // Form Trial
              <form onSubmit={handleTrialAccess} className="space-y-3">
                <h3 className="font-semibold mb-2">Ativar Teste Grátis</h3>
                <input
                  type="text"
                  value={trialNome}
                  onChange={(e) => setTrialNome(e.target.value)}
                  placeholder="Nome"
                  className="w-full border rounded px-3 py-2"
                  required
                />
                <input
                  type="email"
                  value={trialEmail}
                  onChange={(e) => setTrialEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full border rounded px-3 py-2"
                  required
                />
                <button
                  type="submit"
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded w-full"
                >
                  Ativar Teste
                </button>
                <button
                  type="button"
                  className="mt-2 text-sm underline"
                  onClick={() => setTrialMode(false)}
                >
                  Voltar
                </button>
              </form>
            )}
          </div>
        ) : (
          // Tela logado
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 max-w-xl w-full">
            <h2 className="text-2xl font-bold mb-4">
              👋 Bem-vindo, {session.user?.name || session.user?.email}
              <p>Empresa: {session?.user?.empresa}</p>
            </h2>

            {session.user?.expiracao && (
              <p className="text-gray-600 mb-4">
                Expira em: {formatDate(session.user.expiracao)}
              </p>
            )}

            {/* Mostrar mensagem do Google só se expirar em 10 dias ou menos */}
            {session.user?.role !== "trial" && diasRestantes !== null && diasRestantes <= 10 && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                ✅ Seu acesso via Google é válido por 10 dias.
              </div>
            )}

            {/* Botões dinâmicos conforme acessos */}
            <div className="space-y-3">
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
              {acessos?.servicos && (
                <Link href="/servicos" className="block bg-purple-600 text-white px-6 py-2 rounded">
                  ⚙️ Serviços
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
            </div>

            {/* Botão sair atualizado */}
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
    </div>
  );
}