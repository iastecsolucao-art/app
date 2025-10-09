
// pages/api/orders/status.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const ref = (req.query.ref as string | undefined)?.trim() || null;
  const id = req.query.id ? Number(req.query.id) : null;

  if (!ref && !id) {
    return res.status(400).json({ error: "missing_param", detail: "Informe ?ref=... ou ?id=..." });
  }

  try {
    // 1) Tenta por referência (schema com coluna "referencia")
    if (ref) {
      try {
        const { rows } = await dbQuery(
          `SELECT id, referencia, status, total, metodo, created_at
             FROM pedido
            WHERE referencia = $1
            ORDER BY created_at DESC
            LIMIT 1`,
          [ref],
        );
        if (rows.length === 0) {
          // fallback: tenta achar pelo mp_payment_id
          const fb = await dbQuery(
            `SELECT id, referencia, status, total, metodo, created_at
               FROM pedido
              WHERE mp_payment_id = $1
              ORDER BY created_at DESC
              LIMIT 1`,
            [ref],
          );
          if (fb.rows.length === 0) return res.status(404).json({ error: "not_found" });
          return res.status(200).json({ ok: true, order: fb.rows[0] });
        }
        return res.status(200).json({ ok: true, order: rows[0] });
      } catch (e) {
        // 2) Fallback para schema sem "referencia"
        // nesse caso, só conseguimos retornar 404
        return res.status(404).json({ error: "not_found" });
      }
    }

    // Consulta por ID
    if (id) {
      const { rows } = await dbQuery(
        `SELECT id, status, total, created_at
           FROM pedido
          WHERE id = $1
          LIMIT 1`,
        [id],
      );
      if (rows.length === 0) return res.status(404).json({ error: "not_found" });
      return res.status(200).json({ ok: true, order: rows[0] });
    }

    return res.status(400).json({ error: "invalid_params" });
  } catch (e: any) {
    console.error("[/api/orders/status] error:", e);
    return res.status(500).json({ error: "db_error", detail: e?.message });
  }
}
