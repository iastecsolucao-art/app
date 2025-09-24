// pages/_app.js
import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast"; // ✅ Import para feedbacks
import "../styles/globals.css";
import Navbar from "../components/Navbar";

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  useEffect(() => {
    // Evita duplicar o script do Chatwoot
    if (!document.getElementById("chatwoot-script")) {
      const script = document.createElement("script");
      script.id = "chatwoot-script";
      script.src = "https://chat.iastec.servicos.ws/packs/js/sdk.js";
      script.async = true;

      script.onload = () => {
        if (window.chatwootSDK) {
          window.chatwootSDK.run({
            websiteToken: "HNsWAiRv8ps6t615ukxbpNHb",
            baseUrl: "https://chat.iastec.servicos.ws",
          });
        }
      };

      document.body.appendChild(script);
    }
  }, []);

  return (
    <SessionProvider session={session}>
      {/* Navbar fixo */}
      <Navbar />

      {/* Conteúdo (pt-16 compensa altura da Navbar) */}
      <main className="pt-16">
        <Component {...pageProps} />
      </main>

      {/* ✅ Toaster para feedback global */}
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
    </SessionProvider>
  );
}