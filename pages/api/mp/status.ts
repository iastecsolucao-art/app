// pages/api/mp/status.ts
import type { NextApiRequest, NextApiResponse } from "next";

const MP_TOKEN = process.env.MP_ACCESS_TOKEN!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ref = String(req.query.ref || "");
  if (!ref) return res.status(400).json({ error: "missing ref" });

  const url = `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(ref)}&sort=date_created&criteria=desc`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
  const j = await r.json();

  const p = j?.results?.[0];          // o mais recente
  const status = p?.status || null;   // approved, pending, rejected...

  return res.status(200).json({ status, raw: p || null });
}
