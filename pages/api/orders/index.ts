// pages/api/orders/index.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const email = (req.query.email as string | undefined)?.trim() || null;

  try {
    // 1) Tenta com colunas "ricas"
    try {
      const params: any[] = [];
      let where = "";
      if (email) {
        where = "WHERE LOWER(COALESCE(cliente_email,'')) = LOWER($1)";
        params.push(email);
      }
      const { rows } = await dbQuery(
        `
        SELECT
          id,
          empresa_id,
          total,
          status,
          metodo,
          referencia,
          cliente_email,
          created_at
        FROM pedido
        ${where}
        ORDER BY created_at DESC
        LIMIT 100
        `,
        params,
      );
      return res.status(200).json(rows);
    } catch (richErr) {
      // 2) Fallback para schema enxuto (sem as colunas acima)
      const { rows } = await dbQuery(
        `
        SELECT
          id,
          empresa_id,
          total,
          status,
          created_at
        FROM pedido
        ORDER BY created_at DESC
        LIMIT 100
        `,
      );
      return res.status(200).json(rows);
    }
  } catch (e: any) {
    console.error("[/api/orders] error:", e);
    return res.status(500).json({ error: "db_error", detail: e?.message });
  }
}
