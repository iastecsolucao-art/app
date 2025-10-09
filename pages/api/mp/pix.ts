import type { NextApiRequest, NextApiResponse } from "next";
import { pool } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const {
    empresaId,              // pegue da sessão se preferir
    referenceId,            // sua referência (external_reference)
    amount,                 // em REAIS, ex 1.00
    description,
    customer: { name, email },
  } = req.body;

  try {
    // 1) Criar pagamento no MP (SDK/Fetch) e obter payment/preference (exemplo genérico)
    // const mp = new MercadoPago(process.env.MP_ACCESS_TOKEN!);
    // const mpResp = await mp.payments.create({...});
    // const paymentId = mpResp.id;
    // const qrImage = mpResp.point_of_interaction.transaction_data.qr_code_base64;
    // const qrText  = mpResp.point_of_interaction.transaction_data.qr_code;

    // MOCK para exemplo:
    const paymentId = "mp_test_" + Date.now();

    // 2) Gravar o pedido como CRIADO
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO pedido (empresa_id, referencia, email, nome, total, metodo, descricao, status, gateway, gateway_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
         ON CONFLICT (referencia) DO NOTHING`,
        [
          empresaId ?? 1,
          referenceId,
          email,
          name,
          Number(amount),
          "PIX",
          description ?? null,
          "CRIADO",
          "mercadopago",
          paymentId,
        ]
      );
    } finally {
      client.release();
    }

    // 3) Devolva os dados para a tela do PIX transparente
    return res.status(201).json({
      chargeId: paymentId,
      referencia: referenceId,
      qr_image_url: null,     // preencha com o dado real do MP
      qr_text: null,          // idem
      expires_at: null
    });
  } catch (e: any) {
    console.error("[MP create] error:", e);
    return res.status(500).json({ error: "mp_create_failed" });
  }
}
