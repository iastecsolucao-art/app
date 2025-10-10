// pages/api/mp/boleto.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { mpPost, MP_WEBHOOK_URL } from "../../../lib/mp";

type Body = {
  amount: number;              // em reais (ex.: 99.9)
  description?: string;
  referenceId: string;         // external_reference
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    cpf: string;               // obrigatório p/ boleto (BR)
  };
  // opcional (se você estiver mandando entrega)
  shipping?: any;
};

function normalizeAmount(a: any) {
  const n = Number(
    String(a ?? "")
      .replace(/\./g, "")
      .replace(",", ".")
      .trim()
  );
  if (!isFinite(n)) return NaN;
  return Math.round(n * 100) / 100; // 2 casas
}

// ...imports e types iguais

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  try {
    const { amount, description, referenceId, payer, shipping } = req.body as Body;

    const value = Number(Number(amount).toFixed(2));
    if (!isFinite(value) || value < 1) {
      return res.status(400).json({ error: "invalid_amount", detail: "Valor mínimo para boleto é 1.00" });
    }

    const cpf = onlyDigits(payer?.cpf || "");
    if (cpf.length !== 11) {
      return res.status(400).json({ error: "invalid_cpf", detail: "CPF é obrigatório (11 dígitos)." });
    }
    if (!payer?.email) {
      return res.status(400).json({ error: "invalid_email" });
    }
    if (!referenceId) {
      return res.status(400).json({ error: "invalid_reference" });
    }

    // >>> mapeia shipping.address -> payer.address (exigido pelo MP p/ boleto)
    const addr = shipping?.address || {};
    const addrErrors: string[] = [];
    if (!onlyDigits(addr.zip_code)) addrErrors.push("CEP");
    if (!addr.street_name) addrErrors.push("Rua");
    if (!addr.street_number) addrErrors.push("Número");
    if (!addr.neighborhood) addrErrors.push("Bairro");
    if (!addr.city) addrErrors.push("Cidade");
    if (!addr.state) addrErrors.push("UF");

    if (addrErrors.length) {
      return res.status(400).json({
        error: "missing_address_fields",
        detail:
          "Para gerar boleto registrado, informe: " +
          "CEP, Rua, Número, Bairro, Cidade e UF.",
        missing: addrErrors,
      });
    }

    const payload: any = {
      transaction_amount: value,
      description: description ?? "Pedido",
      payment_method_id: "bolbradesco",
      external_reference: referenceId,
      notification_url: MP_WEBHOOK_URL,
      payer: {
        email: payer.email,
        first_name: payer.first_name || "",
        last_name: payer.last_name || "",
        identification: { type: "CPF", number: cpf },
        address: {
          zip_code: onlyDigits(addr.zip_code),
          street_name: String(addr.street_name),
          street_number: String(addr.street_number),
          neighborhood: String(addr.neighborhood),
          city: String(addr.city),
          federal_unit: String(addr.state).toUpperCase(), // UF
        },
      },
    };

    // opcional: manter shipping em additional_info
    if (shipping) payload.additional_info = { shipments: shipping };

    const mp = await mpPost("/v1/payments", payload);
    if (!mp.ok) {
      console.warn("[MP][Boleto] ->", mp.status, mp.data);
      return res.status(mp.status).json(mp.data || { error: "mp_error" });
    }

    const data = mp.data || {};
    const boletoUrl =
      data.transaction_details?.external_resource_url ||
      data.point_of_interaction?.transaction_data?.ticket_url ||
      null;

    const barcode =
      data.barcode?.content ||
      data.point_of_interaction?.transaction_data?.barcode ||
      null;

    return res.status(201).json({
      id: data.id,
      status: data.status,
      boleto_url: boletoUrl,
      barcode,
      date_of_expiration:
        data.date_of_expiration ||
        data.point_of_interaction?.transaction_data?.date_of_expiration ||
        null,
    });
  } catch (e: any) {
    console.error("[/api/mp/boleto] exception:", e);
    return res.status(500).json({ error: "server_error", detail: e?.message });
  }
}
