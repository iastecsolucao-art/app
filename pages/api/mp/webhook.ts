// pages/api/mp/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery } from "../../../lib/db";
import { mpGet } from "../../../lib/mp"; // vamos buscar o status no MP

export const config = {
  api: { bodyParser: true },
};

function isApproved(status?: string) {
  // Mercado Pago pode usar "approved" ou "accredited" em alguns fluxos
  const s = String(status || "").toLowerCase();
  return s === "approved" || s === "accredited";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    console.log("[MP webhook] headers:", req.headers);
    console.log("[MP webhook] body:", req.body);

    const topic =
      (req.query.type as string) ||
      (req.body?.type as string) ||
      (req.body?.action as string) || // às vezes vem em "action": "payment.updated"
      "";

    const dataId =
      req.body?.data?.id ||
      (req.query?.data_id as string) ||
      (req.query?.id as string) ||
      null;

    // Só seguimos se for evento de pagamento e houver um id de pagamento
    if (!topic.toLowerCase().includes("payment") || !dataId) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const paymentId = String(dataId);

    // 1) Consulta o pagamento no MP para confirmar o status
    const pg = await mpGet(`/v1/payments/${paymentId}`);
    if (!pg.ok) {
      console.warn("[MP webhook] Falha ao consultar status do pagamento:", pg.status, pg.data);
      // responde 200 para o MP reentregar depois
      return res.status(200).json({ ok: true, queried: false });
    }

    const status = pg.data?.status;
    console.log("[MP webhook] payment.status:", status);

    if (!isApproved(status)) {
      // não aprovado: não faz nada, mas confirma recebimento
      return res.status(200).json({ ok: true, approved: false, status });
    }

    // 2) Marca o pedido como PAGO e descobre a empresa_id desse pedido
    //    Preferência: mp_payment_id; fallback: referencia
    let pedidoRow: any | null = null;

    // tenta por mp_payment_id
    try {
      const upd = await dbQuery(
        `UPDATE pedido
            SET status = 'PAGO'
          WHERE mp_payment_id = $1
            AND (status IS DISTINCT FROM 'PAGO')
          RETURNING id, empresa_id, referencia, status, total, created_at`,
        [paymentId],
      );
      if (upd.rowCount && upd.rows?.[0]) pedidoRow = upd.rows[0];
    } catch (e) {
      console.warn("[MP webhook] update por mp_payment_id falhou:", e);
    }

    // se não achou, tenta por referencia = paymentId (caso tenha sido salvo assim)
    if (!pedidoRow) {
      try {
        const upd = await dbQuery(
          `UPDATE pedido
              SET status = 'PAGO'
            WHERE referencia = $1
              AND (status IS DISTINCT FROM 'PAGO')
            RETURNING id, empresa_id, referencia, status, total, created_at`,
          [paymentId],
        );
        if (upd.rowCount && upd.rows?.[0]) pedidoRow = upd.rows[0];
      } catch (e) {
        console.warn("[MP webhook] update por referencia falhou:", e);
      }
    }

    // se ainda não achou, tenta localizar o pedido para obter empresa_id
    if (!pedidoRow) {
      try {
        const sel = await dbQuery(
          `SELECT id, empresa_id, referencia, status, total, created_at
             FROM pedido
            WHERE mp_payment_id = $1 OR referencia = $1
            ORDER BY created_at DESC
            LIMIT 1`,
          [paymentId],
        );
        if (sel.rowCount && sel.rows?.[0]) pedidoRow = sel.rows[0];

        // se achou via select e ainda não está "PAGO", marca agora
        if (pedidoRow && String(pedidoRow.status).toUpperCase() !== "PAGO") {
          await dbQuery(
            `UPDATE pedido SET status = 'PAGO' WHERE id = $1`,
            [pedidoRow.id],
          );
          pedidoRow.status = "PAGO";
        }
      } catch (e) {
        console.warn("[MP webhook] select por mp_payment_id/referencia falhou:", e);
      }
    }

    // 3) Se ainda assim não localizamos o pedido, encerramos com OK (MP vai reentregar).
    if (!pedidoRow) {
      console.warn("[MP webhook] Pedido não encontrado para paymentId:", paymentId);
      return res.status(200).json({ ok: true, order_found: false });
    }

    // 4) Renova assinatura da empresa do pedido:
    //    - Todos usuarios com a mesma empresa_id
    //    - expiração = (CASE WHEN expiracao futura -> +30d; expiracao nula/expirada -> NOW()+30d)
    const empresaId = Number(pedidoRow.empresa_id);
    if (!empresaId) {
      console.warn("[MP webhook] empresa_id ausente no pedido, não foi possível renovar usuários.");
      return res.status(200).json({ ok: true, order: pedidoRow, renewed: 0 });
    }

    const renew = await dbQuery(
      `UPDATE usuarios
          SET expiracao = (
                CASE
                  WHEN expiracao IS NULL OR expiracao < NOW()
                    THEN NOW() + INTERVAL '30 days'
                  ELSE expiracao + INTERVAL '30 days'
                END
              ),
              role = CASE WHEN role = 'trial' THEN 'user' ELSE role END
        WHERE empresa_id = $1`,
      [empresaId],
    );

    console.log("[MP webhook] renovados:", renew.rowCount, "usuarios para empresa:", empresaId);

    return res.status(200).json({
      ok: true,
      approved: true,
      paymentId,
      empresa_id: empresaId,
      renewed_users: renew.rowCount || 0,
      order: pedidoRow,
    });
  } catch (e: any) {
    console.error("[/api/mp/webhook] error:", e);
    return res.status(500).json({ error: "webhook_error", detail: e?.message });
  }
}
