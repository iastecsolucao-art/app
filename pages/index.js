import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [trialMode, setTrialMode] = useState(false);
  const [trialNome, setTrialNome] = useState("");
  const [trialEmail, setTrialEmail] = useState("");

  // 🔹 Login manual (credenciais)
  async function handleCredLogin(e) {
    e.preventDefault();
    await signIn("credentials", {
      email,
      senha,
      redirect: true,
      callbackUrl: "/",
    });
  }

  // 🔹 Ativar Trial
  async function handleTrialAccess(e) {
    e.preventDefault();

    const res = await fetch("/api/free-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: trialNome, email: trialEmail }),
    });

    if (res.ok) {
      // após criar usuário trial → loga com credenciais simuladas
      await signIn("credentials", {
        email: trialEmail,
        senha: "trial", // senha dummy
        redirect: true,
        callbackUrl: "/",
      });
    } else {
      alert("Erro ao iniciar teste gratuito.");
    }
  }

  // 🔹 Format Date
  function formatDate(dateString) {
    if (!dateString) return null;
    const d = new Date(dateString);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const expirado =
    session?.user?.expiracao &&
    new Date(session.user.expiracao) < new Date();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <main className="flex flex-col flex-1 items-center justify-center text-center px-6">
        {!session ? (
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              Bem-vindo ao <span className="text-blue-600">App IasTec</span>
            </h2>
            <p className="text-gray-600 mb-4">Escolha uma forma de acesso</p>

            {!trialMode ? (
              <>
                {/* Botão Google */}
                <button
                  onClick={() => signIn("google")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded w-full mb-4"
                >
                  Entrar com Google
                </button>

                {/* Login Manual */}
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

                {/* 🚀 Botão Trial */}
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
                <h3 className="font-semibold mb-2">Ativar Teste Grátis (1 dia)</h3>
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
          // 🔹 Tela logado
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 max-w-xl">
            <h2 className="text-2xl font-bold mb-4">
              👋 Bem-vindo, {session.user?.name || session.user?.email}
            </h2>

            {/* Data de Expiração */}
            {session.user?.expiracao && (
              <p className="text-gray-600 mb-4">
                Expira em: {formatDate(session.user.expiracao)}
              </p>
            )}

            {/* Mensagem conforme role */}
            {session.user?.role === "trial" ? (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                🚀 Você está usando a <b>versão de teste (1 dia)</b>.<br />
                👉 Para continuar após expirar, entre com sua conta Google.
              </div>
            ) : (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                ✅ Seu acesso via <b>Google</b> é válido por <b>10 dias</b>.<br />
                👉 Após expirar, basta logar novamente para renovar seu acesso.
              </div>
            )}

            {/* Links de navegação */}
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="block bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded"
              >
                📊 Acessar Dashboard
              </Link>
              {session.user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="block bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded"
                >
                  Painel Admin
                </Link>
              )}
              <Link
                href="/contagem"
                className="block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
              >
                Inventário
              </Link>
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