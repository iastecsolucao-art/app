// pages/api/pagseguro/card.js

function digits(v = "") {
  return String(v || "").replace(/\D/g, "");
}
function baseUrl() {
  return (process.env.PAGSEGURO_ENV || "sandbox").toLowerCase() === "production"
    ? "https://api.pagseguro.com"
    : "https://sandbox.api.pagseguro.com";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { referenceId, amount, customer, items, card, installments = 1 } = req.body || {};

    if (!referenceId || amount == null) {
      return res.status(400).json({ error: "referenceId e amount são obrigatórios" });
    }
    if (!customer?.name || !customer?.email || !customer?.tax_id) {
      return res.status(400).json({ error: "customer.name, customer.email e customer.tax_id (CPF/CNPJ) são obrigatórios" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items é obrigatório" });
    }
    if (!card?.number || !card?.exp_month || !card?.exp_year || !card?.security_code || !card?.holder?.name || !card?.holder?.tax_id) {
      return res.status(400).json({ error: "dados do cartão incompletos" });
    }

    const token = (process.env.PAGSEGURO_TOKEN || "").trim();
    if (!token) return res.status(400).json({ error: "PAGSEGURO_TOKEN não configurado" });

    const base = baseUrl();
    const totalCents = Math.round(Number(amount) * 100);

    const payload = {
      reference_id: String(referenceId),
      customer: {
        name: customer.name,
        email: customer.email,
        tax_id: digits(customer.tax_id),
        phones: customer.phone
          ? [{ country: "55", area: "11", number: digits(customer.phone), type: "MOBILE" }]
          : undefined,
      },
      items: items.map((it) => ({
        name: it.name,
        quantity: Number(it.quantity || 1),
        unit_amount: Number(it.unit_amount), // centavos
      })),
      charges: [
        {
          reference_id: String(referenceId),
          description: `Pedido #${referenceId}`,
          amount: { value: totalCents, currency: "BRL" },
          payment_method: {
            type: "CREDIT_CARD",
            installments: Number(installments || 1),
            capture: true, // captura imediata; se quiser 2 passos, mude para false e depois capture
            card: {
              number: digits(card.number),
              exp_month: String(card.exp_month).padStart(2, "0"),
              exp_year: String(card.exp_year), // "2027" ou "27" → prefira "2027"
              security_code: digits(card.security_code),
              holder: {
                name: card.holder.name,
                tax_id: digits(card.holder.tax_id),
              },
            },
          },
        },
      ],
      ...(process.env.PAGSEGURO_NOTIFICATION_URL
        ? { notification_urls: [process.env.PAGSEGURO_NOTIFICATION_URL] }
        : {}),
    };

    const resp = await fetch(`${base}/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-api-version": "4.0",
        "x-idempotency-key": String(referenceId),
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();

    if (!resp.ok) {
      console.error("[PagSeguro][card] ERROR:", JSON.stringify(data, null, 2));
      return res.status(400).json({ error: "Falha no pagamento com cartão", details: data });
    }

    const charge = data.charges?.[0] || {};
    const status = (charge.status || data.status || "").toUpperCase();

    return res.status(200).json({
      orderId: data.id,
      status,
      installments: charge.payment_method?.installments || Number(installments || 1),
      authorization_code:
        charge.authorization_code || charge.authorizationCode || null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro no servidor", details: String(e?.message || e) });
  }
}
