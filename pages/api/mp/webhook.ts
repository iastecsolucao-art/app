// pages/api/mp/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery } from "../../../lib/db";
import { MP_API, mpHeaders } from "../../../lib/mp";

// tenta extrair o ID do pagamento que o MP mandou
function getDataId(req: NextApiRequest) {
  const q = req.query || {};
  const b = (req.body ?? {}) as any;

  return (
    b?.data?.id ??
    b?.id ??
    (q["data.id"] as string) ??
    (q.id as string) ??
    null
  );
}

// tenta extrair o "topic"/tipo do evento
function getTopic(req: NextApiRequest) {
  const q = req.query || {};
  const b = (req.body ?? {}) as any;
  return String(q.type ?? q.topic ?? b.type ?? "");
}

// extrai empresa_id do external_reference no formato "emp1-1699999999"
function empresaFromExternalRef(ref?: string | null) {
  if (!ref) return null;
  const m = String(ref).match(/^emp(\d+)-/);
  return m ? Number(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    // Log básico p/ auditoria — útil no Vercel
    console.log("[MP webhook] headers:", req.headers);
    console.log("[MP webhook] body:", req.body);

    const dataId = getDataId(req);                 // id do pagamento
    const topic = getTopic(req).toLowerCase();     // "payment", etc.

    if (!dataId) {
      console.warn("[MP webhook] dataId ausente");
      return res.status(200).json({ ok: true, skip: "no_id" });
    }

    // Para webhooks de payment, buscamos o pagamento completo
    if (topic.includes("payment")) {
      const url = `${MP_API}/v1/payments/${dataId}`;
      const r = await fetch(url, { headers: mpHeaders() });
      const text = await r.text();
      let payment: any = null;
      try {
        payment = JSON.parse(text);
      } catch {
        payment = text;
      }

      if (!r.ok) {
        console.error("[MP webhook] falha ao consultar payment:", r.status, payment);
        return res.status(200).json({ ok: true, fetch_payment_failed: true });
      }

      console.log("[MP webhook] payment:", payment);

      const status = String(payment?.status || "").toLowerCase(); // approved/...
      const externalRef: string | null = payment?.external_reference ?? null;
      const empresa_id = empresaFromExternalRef(externalRef) || 1;

      // Se você salvou mp_payment_id ou referencia na tabela `pedido`,
      // prefira atualizar por elas. Abaixo, como fallback, atualizamos
      // o último pedido CRIADO para a empresa.
      if (status === "approved") {
        // UPDATE do último pedido CRIADO daquela empresa
        await dbQuery(
          `
          WITH alvo AS (
            SELECT id
            FROM pedido
            WHERE empresa_id = $1
              AND status = 'CRIADO'
            ORDER BY created_at DESC
            LIMIT 1
          )
          UPDATE pedido p
             SET status = 'PAGO'
          FROM alvo
          WHERE p.id = alvo.id
          `,
          [empresa_id]
        );

        console.log("[MP webhook] pedido marcado como PAGO (empresa_id:", empresa_id, ")");
      }
    }

    // Retornar 200 SEMPRE que processar a notificação.
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("[MP webhook] exception:", e);
    // Ainda assim respondemos 200 para o MP não re-tentar indefinidamente.
    return res.status(200).json({ ok: true, error: e?.message || String(e) });
  }
}
