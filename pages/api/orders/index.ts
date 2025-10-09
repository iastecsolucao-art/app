import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery } from "../../../lib/db"; // <-- usa a função, não o pool

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    // Exemplo básico: lista últimos pedidos (ajuste os campos conforme sua tabela)
    const { rows } = await dbQuery(
      `SELECT id, empresa_id, total, status, created_at
         FROM pedido
         ORDER BY created_at DESC
         LIMIT 100`
    );

    return res.status(200).json(rows);
  } catch (e: any) {
    console.error("/api/orders error:", e);
    return res.status(500).json({ error: "db_error", detail: e?.message });
  }
}
