import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import QRCode from "qrcode";

/* ===== Tipos ===== */
type Produto = { id: number; descricao: string; preco: number; foto_url?: string | null; };
type CartItem = Produto & { qty: number };
type Cliente = { nome: string; email: string; telefone: string; cpf?: string };
type Endereco = { cep: string; rua: string; numero: string; complemento?: string; bairro: string; cidade: string; uf: string };
type PixResp = { id: string | number; status?: string; qr_code?: string; qr_code_base64?: string; ticket_url?: string; date_of_expiration?: string; };
type BoletoResp = { id: string | number; boleto_url?: string; barcode?: string; status?: string };

/* ===== Utils ===== */
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
const nameParts = (n: string) => { const p = (n || "").trim().split(/\s+/); return { first: p[0] || n || "", last: p.slice(1).join(" ") || "-" }; };
const safeJson = <T,>(t: string): T | null => { try { return JSON.parse(t) as T; } catch { return null; } };
const fmtPhone = (v: string) => { const d = onlyDigits(v).slice(0, 11); return d.length <= 10 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim() : d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim(); };
const fmtCPF = (v: string) => onlyDigits(v).slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4").trim();
const fmtCEP = (v: string) => onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d{0,3})/, "$1-$2").trim();

/* ===== Modal genérico ===== */
function Modal({ open, onClose, title, children, size = "md" }:{
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: "sm"|"md"|"lg";
}) {
  if (!open) return null;
  const maxW = size === "lg" ? "max-w-2xl" : size === "sm" ? "max-w-sm" : "max-w-md";
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className={`w-full ${maxW} rounded-xl bg-white shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100" aria-label="Fechar">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ===== Página ===== */
export default function LojaEmpresa() {
  const router = useRouter();
  const { empresaId } = router.query;

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProds, setLoadingProds] = useState(false);
  const [erroProds, setErroProds] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cliente, setCliente] = useState<Cliente>({ nome: "", email: "", telefone: "", cpf: "" });

  const [querEntrega, setQuerEntrega] = useState(false);
  const [endereco, setEndereco] = useState<Endereco>({ cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "" });

  const [erros, setErros] = useState<Record<string, string>>({});
  const [metodo, setMetodo] = useState<"PIX" | "BOLETO" | "CARTAO">("PIX");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // PIX modal
  const [pixOpen, setPixOpen] = useState(false);
  const [pixData, setPixData] = useState<PixResp | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Drawer carrinho (mobile)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Modal Cartão
  const [cardOpen, setCardOpen] = useState(false);
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvv: "", installments: 1 });

  const total = useMemo(() => cart.reduce((acc, it) => acc + Number(it.preco || 0) * it.qty, 0), [cart]);

  /* Produtos */
  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      try {
        setLoadingProds(true); setErroProds(null);
        const r = await fetch(`/api/store/products?empresaId=${empresaId}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setProdutos(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e); setErroProds("Falha ao carregar produtos.");
      } finally { setLoadingProds(false); }
    })();
  }, [empresaId]);

  /* ViaCEP */
  useEffect(() => {
    const cepDigits = onlyDigits(endereco.cep);
    if (cepDigits.length !== 8) return;
    let canceled = false;
    (async () => {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
        const d = await r.json();
        if (!canceled && !d?.erro) {
          setEndereco((e) => ({ ...e, rua: d.logradouro || e.rua, bairro: d.bairro || e.bairro, cidade: d.localidade || e.cidade, uf: d.uf || e.uf }));
        }
      } catch {}
    })();
    return () => { canceled = true; };
  }, [endereco.cep]);

  /* QR PIX */
  useEffect(() => {
    (async () => {
      if (!pixData) return setQrDataUrl(null);
      if (pixData.qr_code_base64) return setQrDataUrl(`data:image/png;base64,${pixData.qr_code_base64}`);
      if (pixData.qr_code) {
        try { setQrDataUrl(await QRCode.toDataURL(pixData.qr_code, { width: 256, margin: 1 })); }
        catch { setQrDataUrl(null); }
      } else setQrDataUrl(null);
    })();
  }, [pixData]);

  /* Carrinho */
  const add = (p: Produto) => setCart((c) => {
    const i = c.findIndex((x) => x.id === p.id);
    if (i >= 0) { const c2 = [...c]; c2[i] = { ...c2[i], qty: c2[i].qty + 1 }; return c2; }
    return [...c, { ...p, qty: 1 }];
  });
  const dec = (id: number) => setCart((c) => c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, x.qty - 1) } : x)));
  const del = (id: number) => setCart((c) => c.filter((x) => x.id !== id));

  /* Validação */
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

  /* Compartilhar */
  const shareWhatsApp = () => {
    if (cart.length === 0) return;
    const url = typeof window !== "undefined" ? encodeURIComponent(window.location.href) : "";
    const itens = cart.map((i) => `• ${i.descricao} (x${i.qty}) — ${brl(i.preco * i.qty)}`).join("%0A");
    const msg = `Olá!%0AQuero estes itens na Loja #${empresaId}:%0A${itens}%0A%0ATotal: ${brl(total)}%0ALink: ${url}`;
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const abrirMeusPedidos = () => {
    const email = (cliente.email || "").trim();
    router.push(email ? `/pedidos?email=${encodeURIComponent(email)}` : `/pedidos`);
  };

  /* Fluxo de pagamento */
  const finalizarCompra = async () => {
    if (loading) return;
    setStatus(null);

    if (cart.length === 0) return setStatus("Seu carrinho está vazio.");
    if (!validar())   return setStatus("Verifique os campos destacados.");

    setLoading(true);
    try {
      const { first, last } = nameParts(cliente.nome);
      const referencia = `emp${empresaId}-${Date.now()}`;
      const amount = Number(total.toFixed(2));
      const description = cart.length === 1 ? cart[0].descricao : `Pedido (${cart.length} itens) • Loja #${empresaId}`;

      const shipping = querEntrega ? {
        address: {
          zip_code: onlyDigits(endereco.cep),
          street_name: endereco.rua,
          street_number: endereco.numero,
          neighborhood: endereco.bairro,
          city: endereco.cidade,
          state: (endereco.uf || "").toUpperCase(),
          complement: endereco.complemento || "",
        },
      } : undefined;

      if (metodo === "PIX") {
        const r = await fetch("/api/mp/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount, description, referenceId: referencia,
            payer: {
              email: (cliente.email || "").trim(),
              first_name: first, last_name: last,
              cpf: onlyDigits(cliente.cpf || ""), phone: onlyDigits(cliente.telefone || ""),
            }, shipping,
          }),
        });
        const text = await r.text();
        const data = safeJson<PixResp & any>(text) || (text as any);
        if (!r.ok) {
          const msg = (Array.isArray((data as any)?.cause) && (data as any).cause.map((e: any) => `${e?.code}: ${e?.description}`).join(" | ")) ||
                      (data as any)?.message || "Falha ao criar PIX.";
          setStatus(`PIX: ${msg}`); return;
        }
        setPixData(data as PixResp); setPixOpen(true);
        setStatus("PIX criado! Escaneie o QR ou abra o link."); return;
      }

      if (metodo === "BOLETO") {
        const r = await fetch("/api/mp/boleto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount, description, referenceId: referencia,
            payer: {
              email: (cliente.email || "").trim(),
              first_name: first, last_name: last,
              cpf: onlyDigits(cliente.cpf || ""), phone: onlyDigits(cliente.telefone || ""),
            }, shipping,
          }),
        });
        const text = await r.text();
        const data = safeJson<BoletoResp & any>(text) || (text as any);
        if (!r.ok) {
          const msg = (Array.isArray((data as any)?.cause) && (data as any).cause.map((e: any) => `${e?.code}: ${e?.description}`).join(" | ")) ||
                      (data as any)?.message || "Falha ao criar Boleto.";
          setStatus(`Boleto: ${msg}`); return;
        }
        const url = (data as BoletoResp)?.boleto_url;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        setStatus("Boleto gerado. Abrimos a 2ª via em uma nova aba."); return;
      }

      if (metodo === "CARTAO") {
        // abre o modal para capturar os dados do cartão
        setCardOpen(true);
        return;
      }
    } catch (e: any) {
      console.error(e); setStatus(`Erro inesperado: ${e?.message || String(e)}`);
    } finally { setLoading(false); }
  };

  // Envia cartão (se o endpoint existir; caso contrário, mostra erro bonito)
  const pagarComCartao = async () => {
    setStatus(null);
    try {
      const { first, last } = nameParts(cliente.nome);
      const amount = Number(total.toFixed(2));

      const [mm, yy] = (card.exp || "").split("/").map((x) => x.trim());
      const payload = {
        amount,
        payer: { email: (cliente.email || "").trim(), first_name: first, last_name: last, cpf: onlyDigits(cliente.cpf || "") },
        card: {
          number: onlyDigits(card.number),
          exp_month: Number(mm),
          exp_year: Number(yy?.length === 2 ? "20" + yy : yy),
          cvv: onlyDigits(card.cvv),
          holder_name: card.name,
          installments: Number(card.installments || 1),
        },
      };

      const r = await fetch("/api/mp/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = data?.message || data?.error || "Cartão não implementado no servidor.";
        setStatus(`Cartão: ${msg}`);
      } else {
        setStatus("✅ Pagamento aprovado no cartão!");
        setCardOpen(false);
      }
    } catch (e: any) {
      setStatus(`Cartão: ${e?.message || "falha ao processar."}`);
    }
  };

  const copyToClipboard = async (s?: string) => {
    try { if (!s) return; await navigator.clipboard.writeText(s); setStatus("Código PIX copiado!"); }
    catch { setStatus("Não foi possível copiar."); }
  };

  /* ===== UI ===== */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Loja #{String(empresaId || "")}</h1>
          <div className="flex items-center gap-3">
            <button className="hidden sm:inline rounded bg-white/10 hover:bg-white/20 px-3 py-1 text-sm" onClick={abrirMeusPedidos}>Meus pedidos</button>
            {/* Botão carrinho (mobile) */}
            <button onClick={() => setDrawerOpen(true)} className="sm:hidden relative rounded bg-white text-blue-600 px-3 py-1 text-sm font-medium">
              Carrinho
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-blue-600 text-white w-6 h-6 text-xs">{cart.length}</span>
            </button>
            <div className="hidden sm:block text-sm">{cart.length} itens — <strong>{brl(total)}</strong></div>
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
                  <img src={p.foto_url || "/placeholder-product.png"} alt={p.descricao} className="w-full h-full object-cover"
                       onError={(e: any) => (e.currentTarget.src = "/placeholder-product.png")} />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{p.descricao}</h3>
                  <p className="text-sm text-gray-500">{brl(Number(p.preco || 0))}</p>
                </div>
                <button onClick={() => add(p)} className="mt-3 rounded bg-blue-600 text-white py-2 hover:bg-blue-700">Adicionar</button>
              </div>
            ))}
          </div>
        </section>

        {/* Sidebar carrinho (desktop) */}
        <aside className="hidden lg:block bg-white rounded-lg shadow p-4 h-max sticky top-24">
          <CarrinhoUI
            cart={cart} add={add} dec={dec} del={del}
            total={total} cliente={cliente} setCliente={setCliente}
            erros={erros} setErros={setErros}
            metodo={metodo} setMetodo={setMetodo}
            querEntrega={querEntrega} setQuerEntrega={setQuerEntrega}
            endereco={endereco} setEndereco={setEndereco}
            finalizarCompra={finalizarCompra} shareWhatsApp={shareWhatsApp}
            loading={loading} status={status}
          />
        </aside>
      </main>

      {/* Drawer Carrinho (mobile & tablet) */}
      <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Seu carrinho" size="lg">
        <CarrinhoUI
          cart={cart} add={add} dec={dec} del={del}
          total={total} cliente={cliente} setCliente={setCliente}
          erros={erros} setErros={setErros}
          metodo={metodo} setMetodo={setMetodo}
          querEntrega={querEntrega} setQuerEntrega={setQuerEntrega}
          endereco={endereco} setEndereco={setEndereco}
          finalizarCompra={() => { setDrawerOpen(false); finalizarCompra(); }}
          shareWhatsApp={shareWhatsApp}
          loading={loading} status={status}
        />
      </Modal>

      {/* Modal PIX */}
      <Modal open={pixOpen} onClose={() => setPixOpen(false)} title="Pague com PIX">
        {!pixData ? <p className="text-sm text-gray-600">Carregando…</p> : (
          <div className="space-y-3">
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR Code PIX" className="w-56 h-56 mx-auto rounded" />
              : <p className="text-center text-sm text-gray-500">Não recebemos a imagem do QR. Use o “Copiar código PIX”.</p>}
            <div className="text-center">
              <button className="rounded bg-blue-600 text-white px-3 py-2 hover:bg-blue-700" onClick={() => copyToClipboard(pixData.qr_code)}>Copiar código PIX</button>
            </div>
            {pixData.ticket_url && (
              <a href={pixData.ticket_url} target="_blank" rel="noreferrer" className="block text-center text-blue-600 hover:underline">
                Abrir link de pagamento
              </a>
            )}
            <p className="text-xs text-gray-500 text-center">
              ID: {String(pixData.id || "")}
              {pixData.date_of_expiration ? <> • Expira em: {new Date(pixData.date_of_expiration).toLocaleString("pt-BR")}</> : null}
            </p>
          </div>
        )}
      </Modal>

      {/* Modal Cartão */}
      <Modal open={cardOpen} onClose={() => setCardOpen(false)} title="Pague com cartão" size="lg">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">Número do cartão</label>
            <input className="w-full border rounded px-3 py-2" placeholder="4111 1111 1111 1111"
                   value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Nome impresso</label>
            <input className="w-full border rounded px-3 py-2" placeholder="JOAO DA SILVA"
                   value={card.name} onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Validade (MM/AAAA)</label>
            <input className="w-full border rounded px-3 py-2" placeholder="12/2027"
                   value={card.exp} onChange={(e) => setCard((c) => ({ ...c, exp: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500">CVV</label>
            <input className="w-full border rounded px-3 py-2" placeholder="123"
                   value={card.cvv} onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Parcelas</label>
            <select className="w-full border rounded px-3 py-2"
                    value={card.installments}
                    onChange={(e) => setCard((c) => ({ ...c, installments: Number(e.target.value) }))}>
              {Array.from({ length: 12 }).map((_, i) => <option key={i+1} value={i+1}>{i+1}x</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <button className="rounded px-4 py-2 bg-gray-200" onClick={() => setCardOpen(false)}>Cancelar</button>
          <button className="rounded px-4 py-2 bg-emerald-600 text-white" onClick={pagarComCartao}>Pagar</button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          *Se o endpoint <code>/api/mp/card</code> ainda não existir no servidor, exibiremos uma mensagem informando que não está implementado.
        </p>
      </Modal>
    </div>
  );
}

/* ===== Componente do Carrinho (reuso na sidebar e no drawer) ===== */
function CarrinhoUI(props: {
  cart: CartItem[]; add: (p: Produto) => void; dec: (id: number) => void; del: (id: number) => void;
  total: number; cliente: Cliente; setCliente: Function; erros: Record<string, string>; setErros: Function;
  metodo: "PIX"|"BOLETO"|"CARTAO"; setMetodo: Function;
  querEntrega: boolean; setQuerEntrega: Function; endereco: Endereco; setEndereco: Function;
  finalizarCompra: () => void; shareWhatsApp: () => void; loading: boolean; status: string | null;
}) {
  const { cart, add, dec, del, total, cliente, setCliente, erros, metodo, setMetodo,
          querEntrega, setQuerEntrega, endereco, setEndereco, finalizarCompra, shareWhatsApp, loading, status } = props;

  return (
    <div>
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
                <button className="px-2 py-1 bg-gray-100 rounded" onClick={() => dec(it.id)} aria-label="Diminuir">−</button>
                <button className="px-2 py-1 bg-gray-100 rounded" onClick={() => add(it)} aria-label="Aumentar">+</button>
                <button className="px-2 py-1 bg-red-100 text-red-600 rounded" onClick={() => del(it.id)}>Remover</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t pt-3 mb-3">
        <div className="flex items-center justify-between font-semibold">
          <span>Total</span><span>{brl(total)}</span>
        </div>
      </div>

      {/* Dados do cliente */}
      <div className="space-y-2">
        <Input label="Nome completo" value={cliente.nome}   onChange={(v)=>setCliente((s:any)=>({...s,nome:v}))}     error={erros.nome} />
        <Input label="E-mail"         value={cliente.email}  onChange={(v)=>setCliente((s:any)=>({...s,email:v}))}    error={erros.email} />
        <Input label="Telefone"       value={fmtPhone(cliente.telefone)} onChange={(v)=>setCliente((s:any)=>({...s,telefone:v}))} error={erros.telefone} />
        <Input label="CPF (obrigatório p/ Boleto)" value={fmtCPF(cliente.cpf||"")} onChange={(v)=>setCliente((s:any)=>({...s,cpf:v}))} error={erros.cpf} />
      </div>

      {/* Entrega */}
      <div className="mt-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={querEntrega} onChange={(e)=>setQuerEntrega(e.target.checked)} />
          <span>Quero entrega</span>
        </label>
        {querEntrega && (
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Input label="CEP"       value={fmtCEP(endereco.cep)} onChange={(v)=>setEndereco((s:any)=>({...s,cep:v}))} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Rua"     value={endereco.rua} onChange={(v)=>setEndereco((s:any)=>({...s,rua:v}))} />
              <Input label="Número"  value={endereco.numero} onChange={(v)=>setEndereco((s:any)=>({...s,numero:v}))} />
            </div>
            <Input label="Complemento (opcional)" value={endereco.complemento||""} onChange={(v)=>setEndereco((s:any)=>({...s,complemento:v}))} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Bairro" value={endereco.bairro} onChange={(v)=>setEndereco((s:any)=>({...s,bairro:v}))} />
              <Input label="Cidade" value={endereco.cidade} onChange={(v)=>setEndereco((s:any)=>({...s,cidade:v}))} />
            </div>
            <Input label="UF (ex.: SP)" value={endereco.uf} onChange={(v)=>setEndereco((s:any)=>({...s,uf:(v||'').toUpperCase().slice(0,2)}))} />
          </div>
        )}
      </div>

      {/* Pagamento (chips) */}
      <div className="mt-4">
        <div className="font-medium mb-2">Forma de pagamento</div>
        <div className="flex flex-wrap gap-2">
          {(["PIX","BOLETO","CARTAO"] as const).map((m) => (
            <button key={m}
              className={`px-3 py-1.5 rounded-full text-sm border ${
                props.metodo===m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"
              }`}
              onClick={()=>props.setMetodo(m)}>{m==="PIX"?"🔶 PIX":m==="BOLETO"?"📄 Boleto":"💳 Cartão"}</button>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="mt-4 grid grid-cols-1 gap-2">
        <button onClick={finalizarCompra} disabled={loading}
          className={`w-full rounded py-2 text-white ${loading?"bg-green-400 cursor-not-allowed":"bg-green-600 hover:bg-green-700"}`}>
          {loading?"Processando...":"Finalizar compra"}
        </button>
        <button onClick={shareWhatsApp} disabled={cart.length===0}
          className="w-full rounded bg-emerald-100 text-emerald-700 py-2 hover:bg-emerald-200 disabled:opacity-50">
          Compartilhar no WhatsApp
        </button>
      </div>

      {!!status && (
        <div className={`mt-3 text-sm px-3 py-2 rounded border
          ${status.startsWith("✅")?"bg-emerald-50 text-emerald-700 border-emerald-200":
            status.startsWith("Boleto")||status.startsWith("PIX")?"bg-amber-50 text-amber-800 border-amber-200":
            "bg-rose-50 text-rose-700 border-rose-200"}`}>
          {status}
        </div>
      )}
    </div>
  );
}

/* === Inputs pequenos reutilizáveis === */
function Input({ label, value, onChange, error }:{
  label: string; value: string; onChange: (v: string)=>void; error?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input className={`w-full border rounded px-3 py-2 ${error?"border-red-500":""}`} value={value}
             onChange={(e)=>onChange(e.target.value)} />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
