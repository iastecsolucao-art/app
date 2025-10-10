// pages/api/mp/webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery } from "../../../lib/db";
import { mpGet } from "../../../lib/mp";

// O MP manda JSON; manter bodyParser ligado é ok (simples) para esses webhooks
export const config = { api: { bodyParser: true } };

/** Converte status do MP em nosso status interno */
function mapStatus(mpStatus?: string): "PAGO" | "PENDENTE" | "RECUSADO" | "ESTORNADO" {
  const s = String(mpStatus || "").toLowerCase();
  if (["approved", "accredited", "authorized"].includes(s)) return "PAGO";
  if (["in_process", "pending", "in_mediation"].includes(s)) return "PENDENTE";
  if (["rejected", "cancelled"].includes(s)) return "RECUSADO";
  if (["refunded", "charged_back"].includes(s)) return "ESTORNADO";
  return "PENDENTE";
}

/** POST simples para n8n com pequenas tentativas */
async function postToN8n(payload: any) {
  const url = process.env.N8N_WEBHOOK_URL_VENDA;
  if (!url) return { ok: false, skipped: true };
  const tries = [250, 750, 1500]; // re-tentativas com backoff
  for (let i = 0; i < tries.length; i++) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) return { ok: true, status: r.status };
      // em 400s não adianta tentar de novo
      if (r.status >= 400 && r.status < 500) return { ok: false, status: r.status };
    } catch {}
    await new Promise((res) => setTimeout(res, tries[i]));
  }
  return { ok: false, status: 0 };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    if (req.method === "GET") return res.status(200).json({ ok: true, pong: true });
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const topic =
      (req.query.type as string) ||
      (req.body?.type as string) ||
      (req.body?.action as string) || // ex.: "payment.updated"
      "";

    const dataId =
      req.body?.data?.id ||
      (req.query?.data_id as string) ||
      (req.query?.id as string) ||
      null;

    // Só processamos pagamentos com id
    if (!topic.toLowerCase().includes("payment") || !dataId) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const paymentId = String(dataId);

    // 1) Consulta o pagamento no MP para confirmar status e pegar a reference
    const pay = await mpGet(`/v1/payments/${paymentId}`);
    if (!pay.ok) {
      console.warn("[MP webhook] Falha ao consultar payment:", pay.status, pay.data);
      // 200 para o MP reenviar mais tarde
      return res.status(200).json({ ok: true, queried: false });
    }

    const mp = pay.data || {};
    const mpStatus: string | undefined = mp.status;
    const mapped = mapStatus(mpStatus);
    const externalRef: string | null = mp.external_reference || null;

    // 2) Idempotência: atualiza por external_reference (prioridade) ou por mp_payment_id
    let orderRow:
      | (Record<string, any> & { id: number; empresa_id: number; referencia: string | null; status: string })
      | null = null;

    // prioridade: referencia (external_reference) — foi o que você gerou na criação
    if (externalRef) {
      try {
        const upd = await dbQuery(
          `UPDATE pedido
              SET status = $1,
                  mp_payment_id = COALESCE(mp_payment_id, $3)
            WHERE referencia = $2
            RETURNING id, empresa_id, referencia, status, total, created_at`,
          [mapped, externalRef, paymentId],
        );
        if (upd.rowCount && upd.rows?.[0]) orderRow = upd.rows[0] as any;
      } catch (e) {
        console.warn("[MP webhook] update por external_reference falhou:", e);
      }
    }

    // fallback: mp_payment_id
    if (!orderRow) {
      try {
        const upd = await dbQuery(
          `UPDATE pedido
              SET status = $1
            WHERE mp_payment_id = $2
            RETURNING id, empresa_id, referencia, status, total, created_at`,
          [mapped, paymentId],
        );
        if (upd.rowCount && upd.rows?.[0]) {
          orderRow = upd.rows[0] as any;
        } else {
          // última tentativa: localizar por mp_payment_id ou por referencia = paymentId (caso antigo)
          const sel = await dbQuery(
            `SELECT id, empresa_id, referencia, status, total, created_at
               FROM pedido
              WHERE mp_payment_id = $1 OR referencia = $1
              ORDER BY created_at DESC
              LIMIT 1`,
            [paymentId],
          );
          if (sel.rowCount && sel.rows?.[0]) {
            orderRow = sel.rows[0] as any;
            const sync = await dbQuery(
              `UPDATE pedido SET status = $1 WHERE id = $2 RETURNING id, empresa_id, referencia, status, total, created_at`,
              [mapped, orderRow.id],
            );
            if (sync.rowCount && sync.rows?.[0]) orderRow = sync.rows[0] as any;
          }
        }
      } catch (e) {
        console.warn("[MP webhook] fallback por mp_payment_id falhou:", e);
      }
    }

    if (!orderRow) {
      console.warn("[MP webhook] Pedido não localizado (extRef:", externalRef, "paymentId:", paymentId, ")");
      return res.status(200).json({ ok: true, order_found: false, status: mapped });
    }

    // 3) Garante mp_payment_id gravado
    try {
      await dbQuery(
        `UPDATE pedido SET mp_payment_id = COALESCE(mp_payment_id, $1) WHERE id = $2`,
        [paymentId, orderRow.id],
      );
    } catch (e) {
      console.warn("[MP webhook] set mp_payment_id falhou:", e);
    }

    // 4) Busca campos adicionais do pedido (cliente, e-mail, etc.) para enviar ao n8n
    let orderFull = orderRow;
    try {
      const full = await dbQuery(
        `SELECT p.id, p.empresa_id, p.referencia, p.status, p.total, p.created_at,
                p.descricao, p.metodo,
                p.cliente, p.cliente_email, p.cliente_telefone
           FROM pedido p
          WHERE p.id = $1
          LIMIT 1`,
        [orderRow.id],
      );
      if (full.rowCount && full.rows[0]) orderFull = full.rows[0] as any;
    } catch {}

    // 5) Se ficou PAGO agora: renova usuários (+30 dias) da empresa
    let renewedCount = 0;
    if (mapped === "PAGO") {
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
        [Number(orderFull.empresa_id)],
      );
      renewedCount = renew.rowCount || 0;
    }

    // 6) Dispara webhook para o n8n (Chatwoot/CRM/Slack etc.)
    //    Payload caprichado com dados do pedido + infos do payment do MP
    const n8nPayload = {
      source: "mp_webhook",
      event: topic,
      payment: {
        id: paymentId,
        status: mpStatus,
        status_detail: mp.status_detail || null,
        payment_type_id: mp.payment_type_id || null,
        payment_method_id: mp.payment_method_id || null,
        installments: mp.installments || null,
        external_reference: externalRef,
        transaction_amount: mp.transaction_amount || null,
        date_approved: mp.date_approved || null,
      },
      order: {
        id: orderFull.id,
        empresa_id: orderFull.empresa_id,
        referencia: orderFull.referencia,
        total: orderFull.total,
        status: mapped,
        created_at: orderFull.created_at,
        descricao: orderFull.descricao || null,
        metodo: orderFull.metodo || null,
      },
      customer: {
        name: orderFull.cliente || null,
        email: orderFull.cliente_email || null,
        phone: orderFull.cliente_telefone || null,
      },
      renew: {
        made: mapped === "PAGO",
        renewed_users: renewedCount,
      },
    };

    // não falhar o endpoint por causa do n8n; só registra o resultado
    postToN8n(n8nPayload).then((r) => {
      if (!r.ok && !r.skipped) console.warn("[MP webhook] POST n8n falhou:", r.status);
    });

    // 7) Resposta final
    return res.status(200).json({
      ok: true,
      paymentId,
      referencia: orderFull.referencia,
      status: mapped,
      renewed_users: renewedCount,
    });
  } catch (e: any) {
    console.error("[/api/mp/webhook] error:", e);
    return res.status(500).json({ error: "webhook_error", detail: e?.message });
  }
}
