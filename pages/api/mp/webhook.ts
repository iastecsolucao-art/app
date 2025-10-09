// pages/api/mp/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  try {
    // O MP pode mandar dois formatos. Guardamos tudo que chegar para auditoria.
    console.log("[MP webhook] headers:", req.headers);
    console.log("[MP webhook] body:", req.body);

    const topic = req.body?.type || req.query?.type;
    const dataId = req.body?.data?.id || req.query?.data_id || req.query?.id;

    // Se o evento for pagamento aprovado, marque o pedido como PAGO.
    // Você pode buscar a referência pelo payment_id, se tiver salvo,
    // ou usar a sua própria referência (depende de como montou o fluxo).
    if (String(topic).toLowerCase().includes("payment") && dataId) {
      // Exemplo simples: marcar o último pedido CRIADO como PAGO
      await db(`UPDATE pedido SET status='PAGO' WHERE status='CRIADO' ORDER BY id DESC LIMIT 1`);
    }

    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("[MP webhook] ERROR:", e);
    return res.status(500).json({ error: "webhook_error" });
  }
}
