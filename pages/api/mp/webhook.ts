// pages/api/mp/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { MP_API, MP_ACCESS_TOKEN } from "../../../lib/mp";

// Dica: se for implementar verificação de assinatura (x-signature) no futuro,
// habilite o raw body e calcule o HMAC. Por ora, usamos o body parseado.
export const config = {
  api: {
    bodyParser: true,
  },
};

function jsonSafe(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fetchMP(path: string) {
  const r = await fetch(`${MP_API}${path}`, {
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const text = await r.text();
  const data = jsonSafe(text);
  return { ok: r.ok, status: r.status, data };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // Logs úteis para depuração
  console.log("[MP webhook] headers:", req.headers);
  console.log("[MP webhook] body:", req.body);

  // Estruturas comuns do MP:
  // 1) Novo webhook: { type: 'payment'|'merchant_order'|..., action: 'payment.updated'|..., data: { id: '...' } }
  // 2) Clássico (em alguns cenários): query com topic/id (mas o webhook costuma ser POST com body)
  const body: any = req.body ?? {};
  const type = body?.type || body?.topic; // topic (compat)
  const action = body?.action;
  let id: string | null = body?.data?.id ? String(body.data.id) : null;

  // Fallback para notificações antigas (pouco comuns via webhook):
  if (!id && typeof req.query?.id === "string") id = req.query.id as string;

  try {
    if (type === "payment" || (action && action.startsWith("payment"))) {
      if (!id) {
        console.warn("[MP webhook] payment event sem data.id");
        return res.status(200).json({ ok: true, note: "missing payment id" });
      }

      // Confirma pagamento junto ao MP
      const payResp = await fetchMP(`/v1/payments/${id}`);
      console.log("[MP webhook] GET /v1/payments/:id ->", payResp.status, payResp.data);

      if (!payResp.ok) {
        // Mesmo se falhar a consulta, responda 200 para evitar loop de reentrega;
        // você pode reprocessar depois via fila/cron.
        return res.status(200).json({ ok: true, warn: "payment fetch failed" });
      }

      const p: any = payResp.data;
      const status = p?.status;               // approved, rejected, pending, etc.
      const status_detail = p?.status_detail; // detalhes
      const external_reference = p?.external_reference; // id do seu pedido
      const transaction_amount = p?.transaction_amount;

      // TODO: Atualize seu pedido local aqui (por external_reference ou outra chave sua)
      // await db.pedidos.updateByReferencia(external_reference, { status_mp: status, ... });

      console.log("[MP webhook] pagamento confirmado:", {
        id,
        status,
        status_detail,
        external_reference,
        transaction_amount,
      });

      return res.status(200).json({ ok: true });
    }

    if (type === "merchant_order" || (action && action.startsWith("merchant_order"))) {
      if (!id) {
        console.warn("[MP webhook] merchant_order event sem data.id");
        return res.status(200).json({ ok: true, note: "missing merchant_order id" });
      }

      const moResp = await fetchMP(`/merchant_orders/${id}`);
      console.log("[MP webhook] GET /merchant_orders/:id ->", moResp.status, moResp.data);

      if (!moResp.ok) {
        return res.status(200).json({ ok: true, warn: "merchant_order fetch failed" });
      }

      const mo: any = moResp.data;
      // Você pode somar payments aprovados e checar o total, etc.
      // mo.payments => [{ status, transaction_amount, ... }]
      // mo.external_reference => referência do seu pedido
      // TODO: atualizar pedido local se fizer sentido.

      return res.status(200).json({ ok: true });
    }

    // Outros tipos de evento: apenas logue e responda 200
    console.log("[MP webhook] tipo não tratado:", { type, action, id });
    return res.status(200).json({ ok: true, note: "unhandled event" });
  } catch (err: any) {
    // Importante: evite retornar erro != 2xx (o MP tentará reenviar).
    console.error("[MP webhook] erro inesperado:", err);
    return res.status(200).json({ ok: true, error: "handled_exception" });
  }
}
