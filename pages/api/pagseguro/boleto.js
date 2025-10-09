// pages/api/pagseguro/boleto.js

function digits(v = "") {
  return String(v || "").replace(/\D/g, "");
}
function baseUrl() {
  return (process.env.PAGSEGURO_ENV || "sandbox").toLowerCase() === "production"
    ? "https://api.pagseguro.com"
    : "https://sandbox.api.pagseguro.com";
}
function isoDate(d = new Date()) {
  // YYYY-MM-DD
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { referenceId, amount, customer, items } = req.body || {};

    if (!referenceId || amount == null) {
      return res.status(400).json({ error: "referenceId e amount são obrigatórios" });
    }
    if (!customer?.name || !customer?.email || !customer?.tax_id) {
      return res.status(400).json({ error: "customer.name, customer.email e customer.tax_id (CPF/CNPJ) são obrigatórios" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items é obrigatório" });
    }

    const token = (process.env.PAGSEGURO_TOKEN || "").trim();
    if (!token) return res.status(400).json({ error: "PAGSEGURO_TOKEN não configurado" });

    const base = baseUrl();
    const totalCents = Math.round(Number(amount) * 100);
    const dueDays = Number(process.env.BOLETO_DUE_DAYS || 3);
    const dueDate = isoDate(new Date(Date.now() + dueDays * 864e5));

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
        unit_amount: Number(it.unit_amount), // já deve vir em centavos do front
      })),
      charges: [
        {
          reference_id: String(referenceId),
          description: `Pedido #${referenceId}`,
          amount: { value: totalCents, currency: "BRL" },
          payment_method: {
            type: "BOLETO",
            boleto: {
              due_date: dueDate,
              instruction_lines: {
                line_1: "Pague até o vencimento",
                line_2: "Após o vencimento, juros/encargos podem ser aplicados",
              },
              holder: {
                name: customer.name,
                tax_id: digits(customer.tax_id),
                email: customer.email,
              },
              // address é opcional; adicione se seu account exigir
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
      console.error("[PagSeguro][boleto] ERROR:", JSON.stringify(data, null, 2));
      return res.status(400).json({ error: "Falha ao gerar boleto", details: data });
    }

    const charge = data.charges?.[0] || {};
    const pm = charge.payment_method?.boleto || {};
    const boletoPdf =
      charge.links?.find?.((l) => /pdf/i.test(l.rel || ""))?.href ||
      pm.links?.find?.((l) => /pdf/i.test(l.rel || ""))?.href ||
      null;

    return res.status(200).json({
      orderId: data.id,
      status: (charge.status || data.status || "").toUpperCase(),
      boleto_pdf: boletoPdf,
      barcode: pm.formatted_barcode || pm.barcode || null,
      due_date: pm.due_date || null,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro no servidor", details: String(e?.message || e) });
  }
}
