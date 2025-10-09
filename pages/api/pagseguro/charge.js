// pages/api/pagseguro/charge.js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toCents = (v) => Math.round(Number(v || 0) * 100);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { referenceId, amount, description, customer } = req.body || {};
  const env = process.env.PAGSEGURO_ENV || "sandbox";
  const BASE = env === "production" ? "https://api.pagseguro.com" : "https://sandbox.api.pagseguro.com";
  const TOKEN = process.env.PAGSEGURO_TOKEN;
  if (!TOKEN) return res.status(500).json({ error: "PAGSEGURO_TOKEN ausente" });

  // PIX usa endpoint específico:
  const url = `${BASE}/pix/charges`;

  const payload = {
    reference_id: String(referenceId || "").slice(0, 60),
    description: (description || "").slice(0, 80),
    amount: { value: toCents(amount), currency: "BRL" }, // centavos
    payment_method: { type: "PIX", expires_in: 1800 },   // 30 min
  };

  if (customer && customer.name) {
    payload.customer = {
      name: customer.name,
      email: customer.email,
      tax_id: customer.tax_id || undefined, // CPF/CNPJ (só números)
    };
  }

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    "x-api-version": "4.0",
    "x-idempotency-key": `pix-${referenceId}`, // idempotência por referência
  };

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
      const text = await r.text();

      if (r.ok) {
        let data = {};
        try { data = text ? JSON.parse(text) : {}; } catch {}
        return res.status(200).json({
          chargeId:
            data.id || data.charge_id || data.chargeId || null,
          qr_text:
            (data.qr_code && data.qr_code.text) ||
            data.qr_code_text ||
            (data.qr_codes && data.qr_codes[0] && data.qr_codes[0].text) ||
            null,
          qr_image_url:
            (data.qr_code && data.qr_code.links && data.qr_code.links.find(l => l.rel === "qrcode-image")?.href) ||
            (data.qr_codes && data.qr_codes[0] && data.qr_codes[0].links && data.qr_codes[0].links.find(l => l.rel === "qrcode-image")?.href) ||
            null,
          expires_at: data.expires_at || (data.qr_code && data.qr_code.expiration_date) || null,
          raw: data,
        });
      }

      const resp = {
        status: r.status,
        headers: Object.fromEntries(r.headers.entries()),
        raw: text,
      };

      // retry para 5xx do sandbox
      if ([500, 502, 503, 504].includes(r.status) && attempt < 3) {
        await sleep(600 * attempt);
        continue;
      }
      return res.status(400).json(resp);
    } catch (err) {
      lastErr = err?.message || String(err);
      if (attempt < 3) {
        await sleep(600 * attempt);
        continue;
      }
    }
  }

  return res.status(400).json({ status: 500, error: "Upstream error", raw: lastErr });
}
