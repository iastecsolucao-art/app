// pages/api/mp/pix.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { MP_API, MP_WEBHOOK_URL, mpHeaders, safeJson } from "../../../lib/mp";

type Body = {
  amount: number;                 // em reais (ex.: 12.5)
  description?: string;
  referenceId?: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    cpf?: string;
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const { amount, description, referenceId, payer } = (req.body || {}) as Body;

  if (!amount || !payer?.email) {
    return res.status(400).json({ error: "missing_params" });
  }

  const body = {
    transaction_amount: Number(amount),
    description: description ?? "Pedido PIX",
    payment_method_id: "pix",
    external_reference: referenceId,
    notification_url: MP_WEBHOOK_URL || undefined,
    payer: {
      email: payer.email,
      first_name: payer.first_name || undefined,
      last_name: payer.last_name || undefined,
      identification: payer.cpf
        ? { type: "CPF", number: String(payer.cpf).replace(/\D/g, "") }
        : undefined,
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

  // Dados úteis de retorno
  const tx = (data as any)?.point_of_interaction?.transaction_data;
  return res.status(201).json({
    id: (data as any)?.id,
    status: (data as any)?.status,
    qr_code: tx?.qr_code,
    qr_code_base64: tx?.qr_code_base64,   // img base64
    ticket_url: tx?.ticket_url,           // link "transparente" do MP
    date_of_expiration: (data as any)?.date_of_expiration,
  });
}
