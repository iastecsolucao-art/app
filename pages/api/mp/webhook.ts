import type { NextApiRequest, NextApiResponse } from "next";
import { pool } from "../../../lib/db";

// mapeamento simples de status do MP para sua tabela
function mapMpStatus(s: string) {
  const v = (s || "").toLowerCase();
  if (v === "approved") return "PAGO";
  if (v === "rejected") return "RECUSADO";
  if (v === "cancelled") return "CANCELADO";
  return "PENDENTE";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  try {
    // Hot: Mercado Pago pode te enviar query params tipo ?type=payment&id=12345
    // e/ou JSON com data.id. Trate os dois casos:
    const paymentId = (req.query?.id as string) || (req.body?.data?.id as string);
    if (!paymentId) {
      console.log("[MP webhook] payload sem payment id", req.query, req.body);
      return res.status(202).json({ ok: true });
    }

    // 1) Buscar detalhes do pagamento no MP (para obter status e external_reference)
    // const mp = new MercadoPago(process.env.MP_ACCESS_TOKEN!);
    // const pay = await mp.payments.get(paymentId);
    // const status = pay.status;                // 'approved' | 'pending' | ...
    // const externalReference = pay.external_reference;

    // MOCK:
    const status = "approved";
    const externalReference = "emp1-EXEMPLO-123";

    const client = await pool.connect();
    try {
      // 2) Atualizar por referencia (melhor) e também registrar o gateway_id
      const r = await client.query(
        `UPDATE pedido
           SET status = $1, gateway_id = COALESCE(gateway_id, $2)
         WHERE referencia = $3
         RETURNING id`,
        [mapMpStatus(status), String(paymentId), externalReference]
      );

      // fallback: se por algum motivo não achou pela referência, tenta pelo id do gateway
      if (r.rowCount === 0) {
        await client.query(
          `UPDATE pedido
             SET status = $1
           WHERE gateway = 'mercadopago' AND gateway_id = $2`,
          [mapMpStatus(status), String(paymentId)]
        );
      }
    } finally {
      client.release();
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("[MP webhook] error:", e);
    return res.status(500).json({ error: "webhook_error" });
  }
}
