import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Topbar() {
  const router = useRouter();
  const [empresaId, setEmpresaId] = useState<string>("");

  useEffect(() => {
    const q = router.query as Record<string, any>;
    const eid = q.empresaId ?? q.id ?? q.slug ?? localStorage.getItem("lastEmpresaId");
    if (eid) setEmpresaId(String(eid));
  }, [router.query]);

  return (
    <header className="bg-blue-600 text-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">Início</Link>
          {empresaId && (
            <Link
              href={`/loja/${empresaId}`}
              className="opacity-90 hover:opacity-100"
              title="Ir para a loja"
            >
              Loja #{empresaId}
            </Link>
          )}
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/pedidos" className="opacity-90 hover:opacity-100">
            Pedidos
          </Link>
          {/* Coloque outros links aqui, se quiser */}
        </nav>
      </div>
    </header>
  );
}
