// pages/_app.js
import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import "../styles/globals.css";
import Navbar from "../components/Navbar";

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  useEffect(() => {
    // Cria o script dinamicamente
    const script = document.createElement("script");
    script.src = "https://chat.iastec.servicos.ws/packs/js/sdk.js";
    script.async = true;

    script.onload = () => {
      if (window.chatwootSDK) {
        window.chatwootSDK.run({
          websiteToken: "RTEom3jZD76y53TW21o51a86",
          baseUrl: "https://chat.iastec.servicos.ws",
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <SessionProvider session={session}>
      {/* Navbar fixo no topo */}
      <Navbar />
      
      {/* 
        Main recebe padding-top para NÃO deixar o conteúdo escondido 
        Usei pt-16 (64px) pq a Navbar tem cerca de 56px (h-14)
      */}
      <main className="pt-16">
        <Component {...pageProps} />
      </main>
    </SessionProvider>
  );
}