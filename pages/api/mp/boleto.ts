// pages/api/mp/boleto.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { MP_API, MP_WEBHOOK_URL, mpHeaders, safeJson } from "../../../lib/mp";

type Body = {
  amount: number;
  description?: string;
  referenceId?: string;
  payer: {
    email: string;
    first_name: string;
    last_name: string;
    cpf: string;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const { amount, description, referenceId, payer } = (req.body || {}) as Body;

  if (!amount || !payer?.email || !payer.first_name || !payer.last_name || !payer.cpf) {
    return res.status(400).json({ error: "missing_params" });
  }

  const body = {
    transaction_amount: Number(amount),
    description: description ?? "Pedido Boleto",
    payment_method_id: "bolbradesco",
    external_reference: referenceId,
    notification_url: MP_WEBHOOK_URL || undefined,
    payer: {
      email: payer.email,
      first_name: payer.first_name,
      last_name: payer.last_name,
      identification: { type: "CPF", number: String(payer.cpf).replace(/\D/g, "") },
    },
  };

  const r = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: mpHeaders(crypto.randomUUID()),
    body: JSON.stringify(body),
  });

  const text = await r.text();
  const data = safeJson<any>(text) || text;

  if (!r.ok) {
    return res.status(r.status).json(data);
  }

  return res.status(201).json({
    id: (data as any)?.id,
    status: (data as any)?.status,
    boleto_url: (data as any)?.transaction_details?.external_resource_url, // PDF/2ª via
    barcode: (data as any)?.barcode?.content || (data as any)?.barcode,     // se o campo existir
  });
}
