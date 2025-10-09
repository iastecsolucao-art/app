// lib/mp.ts
import crypto from "node:crypto";

export const MP_API = "https://api.mercadopago.com";
export const MP_TOKEN = process.env.MP_ACCESS_TOKEN || "";

export function mpHeaders(idem?: string) {
  return {
    Authorization: `Bearer ${MP_TOKEN}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": idem || crypto.randomUUID(),
  };
}

export async function mpPost(path: string, body: any, idem?: string) {
  const r = await fetch(`${MP_API}${path}`, {
    method: "POST",
    headers: mpHeaders(idem),
    body: JSON.stringify(body),
  });

  const text = await r.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch {}

  if (!r.ok) {
    // loga body bruto pra facilitar debug
    console.error("[MP] POST error", r.status, data || text);
    const msg = typeof data === "object" ? data : { error: text };
    throw Object.assign(new Error("mp_error"), { status: r.status, data: msg });
  }
  return data;
}
