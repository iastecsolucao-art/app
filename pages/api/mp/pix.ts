// pages/api/mp/pix.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { dbQuery } from "../../../lib/db";
import { mpPost } from "../../../lib/mp";

type Body = {
  amount: number;            // em reais (ex.: 1, 10.5)
  description?: string;
  referenceId?: string;      // emp1-16999999999
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    cpf?: string;
  };
};

// extrai empresa_id de "emp1-16999..."
function empresaFromRef(ref?: string) {
  if (!ref) return null;
  const m = String(ref).match(/^emp(\d+)-/);
  return m ? Number(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { amount, description, referenceId, payer } = (req.body || {}) as Body;

    if (!amount || !payer?.email || !referenceId) {
      return res.status(400).json({ error: "invalid_body" });
    }

    const empresa_id = empresaFromRef(referenceId) || 1; // fallback 1 se não vier com prefixo
    const idemp = crypto.randomUUID();

    // Mercado Pago (PIX – sandbox)
    const mpBody = {
      transaction_amount: Number(amount),
      description: description ?? "Pedido",
      payment_method_id: "pix",
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.cpf
          ? { type: "CPF", number: String(payer.cpf).replace(/\D/g, "") }
          : undefined,
      },
    };

    const mp = await mpPost("/v1/payments", mpBody, idemp);
    if (!mp.ok) {
      console.error("[MP][pix] erro:", mp.status, mp.data);
      return res.status(mp.status).json({
        error: "mp_error",
        details: mp.data,
      });
    }

    // pega dados úteis para UI
    const paymentId = mp.data.id;
    const poi = mp.data.point_of_interaction?.transaction_data || {};
    const qr_code = poi.qr_code || null;
    const qr_code_base64 = poi.qr_code_base64 || null;
    const expires_at = poi?.expiration_date || mp.data.date_of_expiration || null;

    // grava pedido no Postgres (colunas que você mostrou no print)
    // id (serial) é gerado automaticamente
    await dbQuery(
      `
      INSERT INTO pedido
        (empresa_id, cliente_id, total, status, created_at, pagamento_pagseguros, cliente)
      VALUES ($1, NULL, $2, $3, NOW(), $4, $5)
      `,
      [
        empresa_id,
        Number(amount),
        "CRIADO",
        "mercado_pago",  // sua coluna no print chama "pagamento_pagseguros"
        "cliente",
      ]
    );

    // Se você TIVER colunas referencia/mp_payment_id, use este insert em vez do de cima:
    /*
    await dbQuery(
      \`
      INSERT INTO pedido
        (empresa_id, total, status, created_at, pagamento_pagseguros, cliente, referencia, mp_payment_id)
      VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7)
      \`,
      [empresa_id, Number(amount), "CRIADO", "mercado_pago", "cliente", referenceId, paymentId]
    );
    */

    return res.status(201).json({
      chargeId: String(paymentId),
      qr_image_url: qr_code_base64 ? `data:image/png;base64,${qr_code_base64}` : null,
      qr_text: qr_code,
      expires_at,
      referenceId,
    });
  } catch (e: any) {
    console.error("[/mp/pix] exception:", e);
    return res.status(500).json({ error: "server_error", message: e?.message });
  }
}
