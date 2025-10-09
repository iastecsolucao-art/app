// lib/mp.ts
import crypto from "node:crypto";

/** ===== Ambiente ========================================================= */
const rawEnv = (process.env.MP_ENV || "sandbox").trim().toLowerCase();
export const isSandbox =
  rawEnv === "sandbox" || rawEnv === "dev" || rawEnv === "development";

/** ===== Bases e Webhook ================================================== */
export const MP_API =
  (process.env.MP_API_BASE || "https://api.mercadopago.com").trim().replace(/\/+$/, "");

export const MP_WEBHOOK_URL =
  (process.env.MP_WEBHOOK_URL ||
    `${(process.env.NEXT_PUBLIC_BASE_URL || "")
      .toString()
      .trim()
      .replace(/\/+$/, "")}/api/mp/webhook`)
    .trim();

/** ===== Util: idempotency ================================================ */
function makeIdempotency(idem?: string) {
  const v = (idem || "").trim();
  if (v) return v;
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** ===== Token & validações =============================================== */
function getToken() {
  return (process.env.MP_ACCESS_TOKEN || "").trim();
}
export function mpTokenPrefix() {
  const t = getToken();
  return t ? t.slice(0, 6) : "";
}

function checkTokenWarnings() {
  const token = getToken();

  if (!token) {
    console.error("[MP] MP_ACCESS_TOKEN está vazio!");
    return;
  }

  const prefix = token.slice(0, 6);
  // sandbox -> TEST-, produção -> APP_USR
  if (isSandbox && !prefix.startsWith("TEST-")) {
    console.warn(
      `[MP] Ambiente sandbox detectado, mas o token não começa com TEST- (prefixo: ${prefix}).`
    );
  }
  if (!isSandbox && !token.startsWith("APP_USR")) {
    console.warn(
      `[MP] Ambiente produção detectado, mas o token não começa com APP_USR (prefixo: ${prefix}).`
    );
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[MP] token prefix:", prefix);
  }
}

/** ===== Headers ========================================================== */
export function mpHeaders(idempotency?: string): Record<string, string> {
  const token = getToken();
  checkTokenWarnings();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Idempotency-Key": makeIdempotency(idempotency),
    "User-Agent": "inventario-app/1.0",
  };

  // Anexa x-integrator-id apenas quando fizer sentido (produção + APP_USR)
  const integrator = (process.env.MP_INTEGRATOR_ID || "").trim();
  if (!isSandbox && token.startsWith("APP_USR") && integrator) {
    headers["x-integrator-id"] = integrator;
  }

  return headers;
}

/** ===== Helpers de request ============================================== */
async function parseResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function mpPost<T = any>(
  path: string,
  body: unknown,
  idempotency?: string
): Promise<{ ok: boolean; status: number; data: T }> {
  const url = `${MP_API}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: mpHeaders(idempotency),
    body: JSON.stringify(body),
  });

  const data: any = await parseResponse(res);
  if (!res.ok) {
    console.error("[MP][POST] %s -> %s %o", path, res.status, data);
  }
  return { ok: res.ok, status: res.status, data };
}

export async function mpGet<T = any>(
  path: string
): Promise<{ ok: boolean; status: number; data: T }> {
  const url = `${MP_API}${path}`;
  const res = await fetch(url, { headers: mpHeaders() });
  const data: any = await parseResponse(res);
  if (!res.ok) {
    console.error("[MP][GET] %s -> %s %o", path, res.status, data);
  }
  return { ok: res.ok, status: res.status, data };
}

/** ===== JSON seguro (útil p/ logs) ====================================== */
export function safeJson<T = any>(text: string) {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null as unknown as T;
  }
}
