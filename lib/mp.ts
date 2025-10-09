// lib/mp.ts
export const MP_API = "https://api.mercadopago.com";

export const MP_WEBHOOK_URL =
  process.env.MP_WEBHOOK_URL ||
  `${process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || ""}/api/mp/webhook`;

export function mpHeaders(idempotency?: string): Record<string, string> {
  const token = process.env.MP_ACCESS_TOKEN || "";
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": idempotency || "",
    // alguns ambientes pedem um user-agent explícito
    "User-Agent": "inventario-app/1.0",
  };
}

export async function mpPost<T = any>(
  path: string,
  body: unknown,
  idempotency?: string
) {
  const url = `${MP_API}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: mpHeaders(idempotency),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

export function safeJson<T = any>(text: string) {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null as unknown as T;
  }
}
