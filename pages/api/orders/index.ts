import type { NextApiRequest, NextApiResponse } from "next";
import { pool } from "../../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const { email, ref } = req.query as { email?: string; ref?: string };

  const client = await pool.connect();
  try {
    if (ref) {
      const r = await client.query(
        `SELECT referencia, email, nome, descricao, total, metodo, status, created_at, gateway
           FROM pedido WHERE referencia = $1`,
        [ref]
      );
      return res.status(200).json(r.rows);
    }

    if (email) {
      const r = await client.query(
        `SELECT referencia, email, nome, descricao, total, metodo, status, created_at, gateway
           FROM pedido
          WHERE LOWER(email) = LOWER($1)
          ORDER BY created_at DESC
          LIMIT 100`,
        [email]
      );
      return res.status(200).json(r.rows);
    }

    return res.status(400).json({ error: "missing email or ref" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error" });
  } finally {
    client.release();
  }
}
