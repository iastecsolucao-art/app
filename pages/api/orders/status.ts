// pages/api/orders/status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery } from "../../../lib/db";

type OrderRow = {
  id: number | string;
  referencia?: string | null;
  status?: string | null;
  total?: number | null;
  metodo?: string | null;
  created_at?: string | Date | null;
  cliente_email?: string | null;
  pagamento_pagseguros?: string | null;
  mp_payment_id?: string | null;
};

function normalize(o: OrderRow) {
  const metodo =
    o.metodo ??
    (o.pagamento_pagseguros ? String(o.pagamento_pagseguros) : null) ??
    (o.mp_payment_id ? "mercado_pago" : null);

  return {
    id: o.id,
    referencia: o.referencia ?? o.mp_payment_id ?? null,
    status: o.status ?? null,
    total: o.total != null ? Number(o.total) : null,
    metodo: metodo ?? null,
    criado_em: o.created_at ? new Date(o.created_at as any).toISOString() : null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const ref = (req.query.ref as string | undefined)?.trim() || null;
  const id = req.query.id ? Number(req.query.id) : null;
  const email = (req.query.email as string | undefined)?.trim() || null;

  if (!ref && !id && !email) {
    return res
      .status(400)
      .json({ error: "missing_param", detail: "Use ?ref=... ou ?id=... ou ?email=..." });
  }

  try {
    // === Consulta por referência (preferencial) ==========================
    if (ref) {
      // 1) Schema com 'referencia' / 'mp_payment_id' / 'metodo'
      try {
        const { rows } = await dbQuery<OrderRow>(
          `
          SELECT id,
                 referencia,
                 status,
                 total,
                 metodo,
                 created_at,
                 cliente_email,
                 pagamento_pagseguros,
                 mp_payment_id
            FROM pedido
           WHERE referencia = $1
              OR mp_payment_id = $1
           ORDER BY created_at DESC
           LIMIT 1
        `,
          [ref]
        );
        if (rows.length) {
          return res.status(200).json({ ok: true, order: normalize(rows[0]) });
        }
      } catch {}

      // 2) Fallback: schema antigo, sem 'referencia' (aí não dá pra achar por ref)
      return res.status(404).json({ error: "not_found" });
    }

    // === Consulta por ID =================================================
    if (id) {
      try {
        const { rows } = await dbQuery<OrderRow>(
          `
          SELECT id,
                 referencia,
                 status,
                 total,
                 metodo,
                 created_at,
                 cliente_email,
                 pagamento_pagseguros,
                 mp_payment_id
            FROM pedido
           WHERE id = $1
           LIMIT 1
        `,
          [id]
        );
        if (rows.length) {
          return res.status(200).json({ ok: true, order: normalize(rows[0]) });
        }
      } catch {
        // Fallback sem 'referencia/metodo'
        const { rows } = await dbQuery<OrderRow>(
          `
          SELECT id,
                 status,
                 total,
                 created_at,
                 cliente_email,
                 pagamento_pagseguros
            FROM pedido
           WHERE id = $1
           LIMIT 1
        `,
          [id]
        );
        if (rows.length) {
          return res.status(200).json({ ok: true, order: normalize(rows[0]) });
        }
      }
      return res.status(404).json({ error: "not_found" });
    }

    // === Lista por e-mail (para "Meus pedidos") ==========================
    if (email) {
      try {
        const { rows } = await dbQuery<OrderRow>(
          `
          SELECT id,
                 referencia,
                 status,
                 total,
                 metodo,
