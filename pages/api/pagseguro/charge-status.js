export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id é obrigatório" });

    const env = (process.env.PAGSEGURO_ENV || "sandbox").toLowerCase();
    const base = env === "production" ? "https://api.pagseguro.com" : "https://sandbox.api.pagseguro.com";
    const token = (process.env.PAGSEGURO_TOKEN || "").trim();

    const r = await fetch(`${base}/charges/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-version": "4.0",
      },
    });
    const d = await r.json();
    if (!r.ok) return res.status(400).json({ error: "Falha ao consultar", details: d });

    return res.status(200).json({ id: d.id, status: (d.status || "").toUpperCase() });
  } catch (e) {
    return res.status(500).json({ error: "Erro no servidor", details: String(e.message || e) });
  }
}
