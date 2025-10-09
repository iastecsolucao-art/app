export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    // O PagSeguro envia eventos de charge/payment aqui.
    // Exemplo simples: marcar pedido como pago quando status = PAID
    const evt = req.body;
    console.log("[PagSeguro Webhook] ", JSON.stringify(evt));

    // TODO: atualizar seu pedido no DB por evt.charge_id / evt.status

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Erro no webhook", details: String(e.message || e) });
  }
}
