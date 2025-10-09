// pages/api/mp/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery } from "../../../lib/db";

// O MP envia JSON; deixe o bodyParser habilitado
export const config = {
  api: { bodyParser: true },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    // Logs para auditoria (ajuda muito na homologação)
    console.log("[MP webhook] headers:", req.headers);
    console.log("[MP webhook] body:", req.body);

    // O MP pode mandar type/id em query ou no body
    const topic =
      (req.query.type as string) ||
      (req.body?.type as string) ||
      "";

    const dataId =
      req.body?.data?.id ||
      (req.query?.data_id as string) ||
      (req.query?.id as string) ||
      (req.query as any)?.data?.id ||
      null;

    // Exemplo simples: pagamento aprovado
    if (topic.toLowerCase().includes("payment") && dataId) {
      const pid = String(dataId);

      // 1) Tenta marcar por mp_payment_id (recomendado salvar isso ao criar o pedido)
      try {
        const byPay = await dbQuery(
          `UPDATE pedido
              SET status = 'PAGO'
            WHERE mp_payment_id = $1
              AND (status IS DISTINCT FROM 'PAGO')
            RETURNING id, referencia, status, total`,
          [pid],
        );

        if (byPay.rowCount && byPay.rowCount > 0) {
          console.log("[MP webhook] PAGO por mp_payment_id:", byPay.rows[0]);
          return res.status(200).json({ ok: true, via: "mp_payment_id", order: byPay.rows[0] });
        }
      } catch (e) {
        console.warn("[MP webhook] update por mp_payment_id falhou (talvez a coluna não exista):", e);
      }

      // 2) Fallback: tenta por referencia = dataId (caso você use o id do pagamento como referência)
      try {
        const byRef = await dbQuery(
          `UPDATE pedido
              SET status = 'PAGO'
            WHERE referencia = $1
              AND (status IS DISTINCT FROM 'PAGO')
            RETURNING id, referencia, status, total`,
          [pid],
        );

        if (byRef.rowCount && byRef.rowCount > 0) {
          console.log("[MP webhook] PAGO por referencia:", byRef.rows[0]);
          return res.status(200).json({ ok: true, via: "referencia", order: byRef.rows[0] });
        }
      } catch (e) {
        console.warn("[MP webhook] update por referencia falhou (talvez a coluna não exista):", e);
      }
    }

    // Se não era um evento de payment (ou não conseguimos identificar o pedido),
    // respondemos 200 para o MP não reentregar indefinidamente.
    return res.status(200).json({ ok: true, received: true });
  } catch (e: any) {
    console.error("[/api/mp/webhook] error:", e);
    return res.status(500).json({ error: "webhook_error", detail: e?.message });
  }
}
