// pages/api/mp/paid.ts
import type { NextApiRequest, NextApiResponse } from "next";
const memoryPaid = (global as any).memoryPaid as Set<string>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const ref = String(req.query.ref || "");
  if (!ref) return res.status(400).json({ error: "missing ref" });

  // Em produção, troque por consulta ao seu DB
  const paid = memoryPaid?.has(ref) ?? false;
  return res.status(200).json({ status: paid ? "approved" : "pending" });
}
