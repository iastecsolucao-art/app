// pages/api/mp/card.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery } from "../../../lib/db";
import { mpPost, MP_WEBHOOK_URL } from "../../../lib/mp";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    amount, description, referenceId, empresa_id,
    token, // vindo do Brick
    issuer_id, payment_method_id, installments,
    payer, pedido, shipping,
  } = req.body;

  // garante pedido criado
  await dbQuery(
    `INSERT INTO pedido
     (empresa_id, referencia, status, metodo, total,
      cliente_nome, cliente_email, cliente_telefone, cpf,
      entrega, cep, rua, numero, complemento, bairro, cidade, uf)
     VALUES ($1,$2,'CRIADO','cartao',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (referencia) DO NOTHING`,
    [
      empresa_id, referenceId, Number(amount),
      pedido?.cliente_nome ?? null, payer?.email ?? null, pedido?.cliente_telefone ?? null, payer?.cpf ?? null,
      !!shipping,
      shipping?.address?.zip_code ?? null, shipping?.address?.street_name ?? null,
      shipping?.address?.street_number ?? null, shipping?.address?.complement ?? null,
      shipping?.address?.neighborhood ?? null, shipping?.address?.city ?? null, shipping?.address?.state ?? null,
    ]
  );

  // pagamento cartão
  const mp = await mpPost("/v1/payments", {
    transaction_amount: Number(amount),
    description,
    token,                         // gerado pelo Brick
    installments: Number(installments || 1),
    issuer_id,
    payment_method_id,            // "visa", "master", etc.
    external_reference: referenceId,
    notification_url: MP_WEBHOOK_URL,
    payer: {
      email: payer?.email,
      first_name: pedido?.cliente_nome?.split(" ")[0],
      last_name: pedido?.cliente_nome?.split(" ").slice(1).join(" ") || "-",
      identification: payer?.cpf ? { type: "CPF", number: payer.cpf.replace(/\D/g, "") } : undefined,
    },
  });

  if (!mp.ok) return res.status(mp.status).json(mp.data);

  const paymentId = mp.data?.id ? String(mp.data.id) : null;
  const status = mp.data?.status ?? "pending";

  if (paymentId) {
    await dbQuery(
      `UPDATE pedido SET mp_payment_id = $1, status = $2 WHERE referencia = $3`,
      [paymentId, status.toUpperCase(), referenceId]
    );
  }

  return res.status(200).json({ chargeId: paymentId, status, referenceId });
}
