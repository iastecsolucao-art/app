// pages/api/mp/pix.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";
import { mpPost } from "../../../lib/mp";

// extrai empresa_id de "emp1-1699999999999"
function empresaFromRef(ref?: string) {
  const m = String(ref || "").match(/^emp(\d+)-/);
  return m ? Number(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { amount, description, referenceId, payer } = req.body || {};
    if (!amount || !referenceId || !payer?.email) {
      return res.status(400).json({ error: "invalid_body" });
    }

    // 1) Cria pagamento PIX no Mercado Pago
    const body = {
      transaction_amount: Number(amount),
      description: description || `Pedido ${referenceId}`,
      payment_method_id: "pix",
      payer: {
        email: payer.email,
        first_name: payer.first_name || undefined,
        last_name:  payer.last_name  || undefined,
        identification: payer.cpf ? { type: "CPF", number: String(payer.cpf) } : undefined,
      },
    };

    const pay = await mpPost("/v1/payments", body);

    // campos relevantes que queremos guardar
    const mp_payment_id = pay?.id;
    const qr_text       = pay?.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qr_image_url  = pay?.point_of_interaction?.transaction_data?.qr_code_base64
      ? `data:image/png;base64,${pay.point_of_interaction.transaction_data.qr_code_base64}`
      : null;
    const expires_at    = pay?.date_of_expiration ?? null;

    // 2) Salva pedido com status CRIADO
    const empresa_id = empresaFromRef(referenceId) ?? 1;
    await db(
      `INSERT INTO pedido
        (empresa_id, total, status, created_at, referencia, pagamento_pagseguros, cliente)
       VALUES ($1, $2, 'CRIADO', NOW(), $3, $4, $5)`,
      [empresa_id, Number(amount), String(referenceId), 'mercadopago', payer.email]
    );

    // 3) Devolve dados p/ a página do PIX
    return res.status(201).json({
      chargeId: String(mp_payment_id),
      qr_text,
      qr_image_url,
      expires_at,
    });
  } catch (e: any) {
    console.error("[/api/mp/pix] ERROR:", e?.status, e?.data || e?.message);
    return res.status(e?.status || 500).json({
      error: "server_error",
      details: e?.data || e?.message || "Internal Server Error",
    });
  }
}
