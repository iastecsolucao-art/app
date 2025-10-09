// pages/pix/[chargeId].tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { brl } from "../../lib/money";

type PixStore = {
  qr_image_url: string | null;
  qr_text: string | null;
  expires_at?: string | null;
  total?: number;
  referencia?: string;
  cliente?: { nome: string; email: string; telefone: string };
};

export default function PixTransparent() {
  const router = useRouter();
  const chargeIdParam = router.query.chargeId;
  const chargeId = Array.isArray(chargeIdParam) ? chargeIdParam[0] : chargeIdParam;

  const [data, setData] = useState<PixStore | null>(null);
  const [status, setStatus] = useState<string>("WAITING"); // WAITING | PAID | ...
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

  // carrega informações salvas ao criar a charge (no client)
  useEffect(() => {
    if (!chargeId) return;
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(`pix:${chargeId}`);
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, [chargeId]);

  // polling de status
  useEffect(() => {
    if (!chargeId) return;
    let stop = false;

    async function tick() {
      try {
        const r = await fetch(`/api/pagseguro/charge-status?id=${encodeURIComponent(chargeId)}`);
        const d = await r.json();
        if (r.ok && d?.status) {
          setStatus(String(d.status).toUpperCase());
          if (String(d.status).toUpperCase() === "PAID") return; // para o polling
        }
      } catch {
        // mantém tentando
      }
      if (!stop) setTimeout(tick, 5000);
    }

    tick();
    return () => {
      stop = true;
    };
  }, [chargeId]);

  const pageUrl = useMemo(() => {
    if (!chargeId) return "";
    const base = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
    return `${base.replace(/\/$/, "")}/pix/${chargeId}`;
  }, [chargeId, baseUrl]);

  const shareWhatsApp = () => {
    const msg =
      `Oi! Segue o link para pagar por PIX: ${pageUrl}\n` +
      (data?.referencia ? `Pedido: ${data.referencia}\n` : "") +
      (data?.total != null ? `Total: ${brl(Number(data.total))}\n` : "") +
      `Abra e escaneie o QR Code ou use "colar código".`;
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    if (typeof window !== "undefined") window.open(url, "_blank");
  };

  const copiarCodigo = async () => {
    if (!data?.qr_text) return;
    try {
      await navigator.clipboard.writeText(data.qr_text);
      alert("Código PIX copiado!");
    } catch {
      // fallback opcional
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-semibold mb-1">Pagamento via PIX</h1>

        <p className="text-sm text-gray-500 mb-4">
          {status === "PAID"
            ? "✅ Pagamento confirmado!"
            : "Aguardando pagamento… Esta página atualiza sozinha."}
        </p>

        {data?.total != null && (
          <div className="mb-2">
            <span className="text-gray-600 text-sm">Total</span>
            <div className="text-xl font-semibold">{brl(Number(data.total))}</div>
          </div>
        )}

        {data?.expires_at && status !== "PAID" && (
          <p className="text-xs text-gray-500 mb-2">
            Expira em: {new Date(data.expires_at).toLocaleString()}
          </p>
        )}

        {status !== "PAID" ? (
          <>
            <div className="flex justify-center my-4">
              {data?.qr_image_url ? (
                <img
                  src={data.qr_image_url}
                  alt="QR Code PIX"
                  className="w-64 h-64 object-contain rounded-md border"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-md">
                  <span className="text-gray-500 text-sm">Carregando QR Code…</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={copiarCodigo}
                className="flex-1 bg-gray-900 text-white rounded-md py-2 hover:bg-black"
              >
                Copiar código PIX
              </button>

              <button
                onClick={shareWhatsApp}
                className="rounded-md py-2 px-3 bg-green-500 text-white hover:bg-green-600"
              >
                Compartilhar no WhatsApp
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <p className="text-green-700 font-medium">
              Obrigado! Seu pagamento foi confirmado.
            </p>
            <button
              onClick={() => router.push(`/loja/${router.query?.empresaId ?? ""}`)}
              className="mt-3 rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
            >
              Voltar à loja
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
