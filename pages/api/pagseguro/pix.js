// pages/api/pagseguro/pix.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { pedidoId, amount, description = "" } = req.body || {};
    if (!pedidoId || amount == null) return res.status(400).json({ error: "pedidoId e amount são obrigatórios" });

    const env = (process.env.PAGSEGURO_ENV || "sandbox").toLowerCase();
    const base = env === "production" ? "https://api.pagseguro.com" : "https://sandbox.api.pagseguro.com";
    const token = (process.env.PAGSEGURO_TOKEN || "").trim();
    if (!token) return res.status(400).json({ error: "PAGSEGURO_TOKEN não configurado" });

    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return res.status(400).json({ error: "amount inválido" });

    // Payload da CHARGES API — nada de customer/items/charges[], e sem notification_id
    const payload = {
      reference_id: String(pedidoId),
      description: description || `Pedido #${pedidoId}`,
      amount: { value: cents, currency: "BRL" },
      payment_method: { type: "PIX", expires_in: Number(process.env.PS_PIX_EXPIRES_IN || 1800) },
      ...(process.env.PAGSEGURO_NOTIFICATION_URL
        ? { notification_urls: [process.env.PAGSEGURO_NOTIFICATION_URL] }
        : {}),
    };

    const resp = await fetch(`${base}/charges`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-idempotency-key": String(pedidoId),
        "x-api-version": "4.0",
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error("PagSeguro PIX (charges) error:", JSON.stringify(data, null, 2));
      return res.status(400).json({ error: "Falha ao criar cobrança PIX", details: data });
    }

    const qr = data.qr_codes?.[0] || {};
    const qrImg =
      qr.links?.find?.((l) => l.rel === "qrcode")?.href ||
      data.links?.find?.((l) => l.rel === "qrcode")?.href ||
      null;

    return res.status(200).json({
      chargeId: data.id,
      status: (data.status || "").toUpperCase(),
      expires_at: qr.expires_at || data.expires_at || null,
      qr_text: qr.text || data.qr_code || null,
      qr_image_url: qrImg,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro no servidor", details: String(e?.message || e) });
  }
}
