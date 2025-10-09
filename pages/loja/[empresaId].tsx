import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import QRCode from "qrcode";

/* ========== Tipos ========== */
type Produto = {
  id: number;
  descricao: string;
  preco: number; // em reais
  foto_url?: string | null;
};
type CartItem = Produto & { qty: number };

type Cliente = {
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
};

type Endereco = {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
};

type PixResp = {
  id: string | number;
  status?: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  date_of_expiration?: string;
};

type BoletoResp = {
  id: string | number;
  boleto_url?: string;
  barcode?: string;
  status?: string;
};

/* ========== Utils ========== */
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
const nameParts = (n: string) => {
  const p = (n || "").trim().split(/\s+/);
  return { first: p[0] || n || "", last: p.slice(1).join(" ") || "-" };
};
const safeJson = <T,>(t: string): T | null => {
  try {
    return JSON.parse(t) as T;
  } catch {
    return null;
  }
};

// máscaras simples
const fmtPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
};
const fmtCPF = (v: string) =>
  onlyDigits(v).slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4").trim();
const fmtCEP = (v: string) =>
  onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d{0,3})/, "$1-$2").trim();

/* ========== Modal ========== */
function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ========== Página ========== */
export default function LojaEmpresa() {
  const router = useRouter();
  const { empresaId } = router.query;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProds, setLoadingProds] = useState(false);
  const [erroProds, setErroProds] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cliente, setCliente] = useState<Cliente>({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
  });

  // entrega
  const [querEntrega, setQuerEntrega] = useState(false);
  const [endereco, setEndereco] = useState<Endereco>({
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

  // erros de validação
  const [erros, setErros] = useState<Record<string, string>>({});

  const [metodo, setMetodo] = useState<"PIX" | "BOLETO" | "CARTAO">("PIX");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // PIX Modal
  const [pixOpen, setPixOpen] = useState(false);
  const [pixData, setPixData] = useState<PixResp | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const total = useMemo(
    () => cart.reduce((acc, it) => acc + Number(it.preco || 0) * it.qty, 0),
    [cart]
  );

  /* ---- Carrega produtos ---- */
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      try {
        setLoadingProds(true);
        setErroProds(null);
        const r = await fetch(`/api/store/products?empresaId=${empresaId}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setProdutos(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setErroProds("Falha ao carregar produtos.");
      } finally {
        setLoadingProds(false);
      }
    })();
  }, [empresaId]);

  /* ---- Auto-preenche por CEP (ViaCEP) ---- */
  useEffect(() => {
    const cepDigits = onlyDigits(endereco.cep);
    if (cepDigits.length !== 8) return;
    let canceled = false;
    (async () => {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        const d = await r.json();
        if (!canceled && !d?.erro) {
          setEndereco((e) => ({
            ...e,
            rua: d.logradouro || e.rua,
            bairro: d.bairro || e.bairro,
            cidade: d.localidade || e.cidade,
            uf: d.uf || e.uf,
          }));
        }
      } catch {}
    })();
    return () => {
      canceled = true;
    };
  }, [endereco.cep]);

  /* ---- Gera imagem do QR (fallback) ---- */
  useEffect(() => {
    (async () => {
      if (!pixData) {
        setQrDataUrl(null);
        return;
      }
      if (pixData.qr_code_base64) {
        setQrDataUrl(`data:image/png;base64,${pixData.qr_code_base64}`);
        return;
      }
      if (pixData.qr_code) {
        try {
          const url = await QRCode.toDataURL(pixData.qr_code, { width: 256, margin: 1 });
          setQrDataUrl(url);
        } catch {
          setQrDataUrl(null);
        }
      } else {
        setQrDataUrl(null);
      }
    })();
  }, [pixData]);

  /* ---- Carrinho ---- */
  const add = (p: Produto) =>
    setCart((c) => {
      const i = c.findIndex((x) => x.id === p.id);
      if (i >= 0) {
        const c2 = [...c];
        c2[i] = { ...c2[i], qty: c2[i].qty + 1 };
        return c2;
      }
      return [...c, { ...p, qty: 1 }];
    });
  const dec = (id: number) =>
    setCart((c) =>
      c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))
    );
  const del = (id: number) => setCart((c) => c.filter((x) => x.id !== id));

  /* ---- Validação ---- */
  function validar(): boolean {
    const e: Record<string, string> = {};
    const nome = (cliente.nome || "").trim();
    const email = (cliente.email || "").trim();
    const telDigits = onlyDigits(cliente.telefone);
    const cpfDigits = onlyDigits(cliente.cpf || "");

    if (nome.length < 3) e.nome = "Informe o nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "E-mail inválido.";
    if (telDigits.length < 10) e.telefone = "Telefone inválido.";
    if (metodo === "BOLETO" && cpfDigits.length !== 11) e.cpf = "CPF obrigatório para boleto.";

    if (querEntrega) {
      const cepDigits = onlyDigits(endereco.cep);
      if (cepDigits.length !== 8) e.cep = "CEP inválido.";
      if (!endereco.rua) e.rua = "Informe a rua.";
      if (!endereco.numero) e.numero = "Informe o número.";
      if (!endereco.bairro) e.bairro = "Informe o bairro.";
      if (!endereco.cidade) e.cidade = "Informe a cidade.";
      if (!/^[A-Z]{2}$/i.test(endereco.uf || "")) e.uf = "UF inválida.";
    }

    setErros(e);
    return Object.keys(e).length === 0;
  }

  /* ---- WhatsApp ---- */
  const shareWhatsApp = () => {
    if (cart.length === 0) return;
    const url =
      typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "";
    const itens = cart
      .map((i) => `• ${i.descricao} (x${i.qty}) — ${brl(i.preco * i.qty)}`)
      .join("%0A");
    const msg = `Olá!%0AQuero estes itens na Loja #${empresaId}:%0A${itens}%0A%0ATotal: ${brl(
      total
    )}%0ALink: ${url}`;
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  /* ---- Meus pedidos ---- */
  function abrirMeusPedidos() {
    const email = (cliente.email || "").trim();
    if (email) {
      router.push(`/pedidos?email=${encodeURIComponent(email)}`);
    } else {
      router.push(`/pedidos`);
    }
  }

  /* ---- Finalizar compra ---- */
  const finalizarCompra = async () => {
    if (loading) return;
    setStatus(null);

    if (cart.length === 0) {
      setStatus("Seu carrinho está vazio.");
      return;
    }
    if (!validar()) {
      setStatus("Verifique os campos destacados.");
      return;
    }

    setLoading(true);
    try {
      const { first, last } = nameParts(cliente.nome);
      const referencia = `emp${empresaId}-${Date.now()}`;
      const amount = Number(total.toFixed(2));
      const description =
        cart.length === 1
          ? cart[0].descricao
          : `Pedido (${cart.length} itens) • Loja #${empresaId}`;

      // shipping opcional
      const shipping = querEntrega
        ? {
            address: {
              zip_code: onlyDigits(endereco.cep),
              street_name: endereco.rua,
              street_number: endereco.numero,
              neighborhood: endereco.bairro,
              city: endereco.cidade,
              state: (endereco.uf || "").toUpperCase(),
              complement: endereco.complemento || "",
            },
          }
        : undefined;

      if (metodo === "PIX") {
        const r = await fetch("/api/mp/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            description,
            referenceId: referencia,
            payer: {
              email: (cliente.email || "").trim(),
              first_name: first,
              last_name: last,
              cpf: onlyDigits(cliente.cpf || ""),
              phone: onlyDigits(cliente.telefone || ""),
            },
            shipping,
          }),
        });

        const text = await r.text();
        const data = safeJson<PixResp & any>(text) || (text as any);
        console.log("[PIX mp] status:", r.status, "body:", data);

        if (!r.ok) {
          const msg =
            (Array.isArray((data as any)?.cause) &&
              (data as any).cause
                .map((e: any) => `${e?.code}: ${e?.description}`)
                .join(" | ")) ||
            (data as any)?.message ||
            "Falha ao criar PIX.";
        setStatus(`PIX: ${msg}`);
          return;
        }

        setPixData(data as PixResp);
        setPixOpen(true);
        setStatus("PIX criado! Escaneie o QR ou abra o link.");
        return;
      }

      if (metodo === "BOLETO") {
        const r = await fetch("/api/mp/boleto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            description,
            referenceId: referencia,
            payer: {
              email: (cliente.email || "").trim(),
              first_name: first,
              last_name: last,
              cpf: onlyDigits(cliente.cpf || ""),
              phone: onlyDigits(cliente.telefone || ""),
            },
            shipping,
          }),
        });

        const text = await r.text();
        const data = safeJson<BoletoResp & any>(text) || (text as any);
        console.log("[Boleto mp] status:", r.status, "body:", data);

        if (!r.ok) {
          const msg =
            (Array.isArray((data as any)?.cause) &&
              (data as any).cause
                .map((e: any) => `${e?.code}: ${e?.description}`)
                .join(" | ")) ||
            (data as any)?.message ||
            "Falha ao criar Boleto.";
          setStatus(`Boleto: ${msg}`);
          return;
        }

        const url = (data as BoletoResp)?.boleto_url;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        setStatus("Boleto gerado. Abrimos a 2ª via em uma nova aba.");
        return;
      }

      if (metodo === "CARTAO") {
        setStatus("Cartão: integração não implementada neste fluxo.");
        return;
      }
    } catch (e: any) {
      console.error(e);
      setStatus(`Erro inesperado: ${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (s?: string) => {
    try {
      if (!s) return;
      await navigator.clipboard.writeText(s);
      setStatus("Código PIX copiado!");
    } catch {
      setStatus("Não foi possível copiar.");
    }
  };

  /* ========== UI ========== */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Loja #{String(empresaId || "")}</h1>

          <div className="flex items-center gap-2">
            <button
              className="rounded bg-white/10 hover:bg-white/20 px-3 py-1 text-sm"
              onClick={abrirMeusPedidos}
              title="Consultar meus pedidos"
            >
              Meus pedidos
            </button>
            <div className="text-sm">
              {cart.length} itens — <strong>{brl(total)}</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 py-6">
        {/* Produtos */}
        <section className="lg:col-span-2">
          <div className="flex items-end justify-between mb-2">
            <h2 className="text-xl font-semibold">Produtos</h2>
            {loadingProds && <span className="text-sm text-gray-500">Carregando…</span>}
          </div>

          {erroProds && <p className="text-red-600">{erroProds}</p>}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {produtos.map((p) => (
              <div key={p.id} className="bg-white rounded-lg shadow p-3 flex flex-col">
                <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-3 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.foto_url || "/placeholder-product.png"}
                    alt={p.descricao}
                    className="w-full h-full object-cover"
                    onError={(e: any) => (e.currentTarget.src = "/placeholder-product.png")}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{p.descricao}</h3>
                  <p className="text-sm text-gray-500">{brl(Number(p.preco || 0))}</p>
                </div>
                <button
                  onClick={() => add(p)}
                  className="mt-3 rounded bg-blue-600 text-white py-2 hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Carrinho + Dados */}
        <aside className="bg-white rounded-lg shadow p-4 h-max">
          <h2 className="text-lg font-semibold mb-3">Carrinho</h2>

          {cart.length === 0 ? (
            <p className="text-sm text-gray-500">Seu carrinho está vazio.</p>
          ) : (
            <ul className="space-y-2 mb-3">
              {cart.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{it.descricao}</div>
                    <div className="text-xs text-gray-500">
                      {it.qty} × {brl(it.preco)} = {brl(it.preco * it.qty)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 bg-gray-100 rounded"
                      onClick={() => dec(it.id)}
                      aria-label="Diminuir"
                    >
                      −
                    </button>
                    <button
                      className="px-2 py-1 bg-gray-100 rounded"
                      onClick={() => add(it)}
                      aria-label="Aumentar"
                    >
                      +
                    </button>
                    <button
                      className="px-2 py-1 bg-red-100 text-red-600 rounded"
                      onClick={() => del(it.id)}
                    >
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t pt-3 mb-3">
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span>{brl(total)}</span>
            </div>
          </div>

          {/* Dados do cliente */}
          <div className="space-y-2">
            <div>
              <input
                placeholder="Nome completo"
                className={`w-full border rounded px-3 py-2 ${erros.nome ? "border-red-500" : ""}`}
                value={cliente.nome}
                onChange={(e) => setCliente((v) => ({ ...v, nome: e.target.value }))}
              />
              {erros.nome && <p className="text-xs text-red-600">{erros.nome}</p>}
            </div>
            <div>
              <input
                placeholder="E-mail"
                className={`w-full border rounded px-3 py-2 ${erros.email ? "border-red-500" : ""}`}
                value={cliente.email}
                onChange={(e) => setCliente((v) => ({ ...v, email: e.target.value }))}
              />
              {erros.email && <p className="text-xs text-red-600">{erros.email}</p>}
            </div>
            <div>
              <input
                placeholder="Telefone"
                className={`w-full border rounded px-3 py-2 ${erros.telefone ? "border-red-500" : ""}`}
                value={fmtPhone(cliente.telefone)}
                onChange={(e) => setCliente((v) => ({ ...v, telefone: e.target.value }))}
              />
              {erros.telefone && <p className="text-xs text-red-600">{erros.telefone}</p>}
            </div>
            <div>
              <input
                placeholder="CPF (opcional para PIX • obrigatório p/ Boleto)"
                className={`w-full border rounded px-3 py-2 ${erros.cpf ? "border-red-500" : ""}`}
                value={fmtCPF(cliente.cpf || "")}
                onChange={(e) => setCliente((v) => ({ ...v, cpf: e.target.value }))}
              />
              {erros.cpf && <p className="text-xs text-red-600">{erros.cpf}</p>}
            </div>
          </div>

          {/* Entrega */}
          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={querEntrega}
                onChange={(e) => setQuerEntrega(e.target.checked)}
              />
              <span>Quero entrega</span>
            </label>

            {querEntrega && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <div>
                  <input
                    placeholder="CEP"
                    className={`w-full border rounded px-3 py-2 ${erros.cep ? "border-red-500" : ""}`}
                    value={fmtCEP(endereco.cep)}
                    onChange={(e) => setEndereco((v) => ({ ...v, cep: e.target.value }))}
                  />
                  {erros.cep && <p className="text-xs text-red-600">{erros.cep}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      placeholder="Rua"
                      className={`w-full border rounded px-3 py-2 ${erros.rua ? "border-red-500" : ""}`}
                      value={endereco.rua}
                      onChange={(e) => setEndereco((v) => ({ ...v, rua: e.target.value }))}
                    />
                    {erros.rua && <p className="text-xs text-red-600">{erros.rua}</p>}
                  </div>
                  <div>
                    <input
                      placeholder="Número"
                      className={`w-full border rounded px-3 py-2 ${erros.numero ? "border-red-500" : ""}`}
                      value={endereco.numero}
                      onChange={(e) => setEndereco((v) => ({ ...v, numero: e.target.value }))}
                    />
                    {erros.numero && <p className="text-xs text-red-600">{erros.numero}</p>}
                  </div>
                </div>

                <input
                  placeholder="Complemento (opcional)"
                  className="w-full border rounded px-3 py-2"
                  value={endereco.complemento || ""}
                  onChange={(e) => setEndereco((v) => ({ ...v, complemento: e.target.value }))}
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <input
                      placeholder="Bairro"
                      className={`w-full border rounded px-3 py-2 ${erros.bairro ? "border-red-500" : ""}`}
                      value={endereco.bairro}
                      onChange={(e) => setEndereco((v) => ({ ...v, bairro: e.target.value }))}
                    />
                    {erros.bairro && <p className="text-xs text-red-600">{erros.bairro}</p>}
                  </div>
                  <div>
                    <input
                      placeholder="Cidade"
                      className={`w-full border rounded px-3 py-2 ${erros.cidade ? "border-red-500" : ""}`}
                      value={endereco.cidade}
                      onChange={(e) => setEndereco((v) => ({ ...v, cidade: e.target.value }))}
                    />
                    {erros.cidade && <p className="text-xs text-red-600">{erros.cidade}</p>}
                  </div>
                </div>

                <div>
                  <input
                    placeholder="UF (ex.: SP)"
                    className={`w-full border rounded px-3 py-2 ${erros.uf ? "border-red-500" : ""}`}
                    value={endereco.uf}
                    onChange={(e) =>
                      setEndereco((v) => ({
                        ...v,
                        uf: (e.target.value || "").toUpperCase().slice(0, 2),
                      }))
                    }
                  />
                  {erros.uf && <p className="text-xs text-red-600">{erros.uf}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Método de pagamento */}
          <div className="mt-4 space-y-2">
            <div className="font-medium">Forma de pagamento</div>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pg"
                checked={metodo === "PIX"}
                onChange={() => setMetodo("PIX")}
              />
              <span>PIX (QR Code / link)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pg"
                checked={metodo === "BOLETO"}
                onChange={() => setMetodo("BOLETO")}
              />
              <span>Boleto</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="pg"
                checked={metodo === "CARTAO"}
                onChange={() => setMetodo("CARTAO")}
              />
              <span>Cartão</span>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              onClick={finalizarCompra}
              disabled={loading}
              className={`w-full rounded py-2 text-white ${
                loading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {loading ? "Processando..." : "Finalizar compra"}
            </button>

            <button
              onClick={shareWhatsApp}
              className="w-full rounded bg-emerald-100 text-emerald-700 py-2 hover:bg-emerald-200 disabled:opacity-50"
              disabled={cart.length === 0}
              title="Compartilhar pedido no WhatsApp"
            >
              Compartilhar no WhatsApp
            </button>
          </div>

          {status && <p className="mt-3 text-sm text-center">{status}</p>}
        </aside>
      </main>

      {/* Modal PIX */}
      <Modal open={pixOpen} onClose={() => setPixOpen(false)} title="Pague com PIX">
        {!pixData ? (
          <p className="text-sm text-gray-600">Carregando…</p>
        ) : (
          <div className="space-y-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="QR Code PIX"
                className="w-56 h-56 mx-auto rounded"
              />
            ) : (
              <p className="text-center text-sm text-gray-500">
                Não recebemos a imagem do QR. Use o “Copiar código PIX”.
              </p>
            )}

            <div className="text-center">
              <button
                className="rounded bg-blue-600 text-white px-3 py-2 hover:bg-blue-700"
                onClick={() => copyToClipboard(pixData.qr_code)}
              >
                Copiar código PIX
              </button>
            </div>

            {pixData.ticket_url && (
              <a
                href={pixData.ticket_url}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-blue-600 hover:underline"
              >
                Abrir link de pagamento
              </a>
            )}

            <p className="text-xs text-gray-500 text-center">
              ID: {String(pixData.id || "")}
              {pixData.date_of_expiration ? (
                <> • Expira em: {new Date(pixData.date_of_expiration).toLocaleString("pt-BR")}</>
              ) : null}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
