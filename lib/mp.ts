// lib/mp.ts
import crypto from "node:crypto";

/** Use .env.local para alternar */
export const MP_ENV =
  (process.env.MP_ENV || "sandbox").toLowerCase() === "production"
    ? "production"
    : "sandbox";

/** Tokens/Pubs */
export const MP_ACCESS_TOKEN =
  MP_ENV === "production"
    ? (process.env.MP_ACCESS_TOKEN_PROD as string)
    : (process.env.MP_ACCESS_TOKEN_TEST as string);

export const MP_PUBLIC_KEY =
  MP_ENV === "production"
    ? (process.env.MP_PUBLIC_KEY_PROD as string)
    : (process.env.MP_PUBLIC_KEY_TEST as string);

/** Webhook público (https) */
export const MP_WEBHOOK_URL = process.env.MP_WEBHOOK_URL || "";

/** Base da API (é a mesma para sandbox/prod; o que muda é o token) */
export const MP_API = "https://api.mercadopago.com";

/** Helpers */
export const safeJson = <T = any>(s: string): T | null => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
};

export const mpHeaders = (idemp?: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
  "X-Idempotency-Key": idemp ?? crypto.randomUUID(),
});
