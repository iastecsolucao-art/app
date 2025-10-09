import type { NextApiRequest, NextApiResponse } from "next";
import { dbQuery } from "../../../lib/db";

type Row = {
  id: number | string;
  referencia?: string | null;
  descricao?: string | null;
  status?: string | null;
  total?: number | null;
  metodo?: string | null;
  created_at?: string | Date | null;
  pagamento_pagseguros?: string | null;
  mp_payment_id?: string | null;
  email?: string | null;
  cliente_email?: string | null;
  cliente?: string | null;
};

function normalize(r: Row) {
  const metodo =
    r.metodo ??
    (r.pagamento_pagseguros ? String(r.pagamento_pagseguros) : null);

  return {
    id: r.id,
    referencia: r.referencia || r.mp_payment_id || null,
    descricao: r.descricao || null,
    total: r.total != null ? Number(r.total) : null,
    metodo: metodo || null,
    status: r.status || null,
    criado_em: r.created_at ? new Date(r.created_at as any).toISOString() : null,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const emailRaw = (req.query.email as string | undefined)?.trim();
  if (!emailRaw) {
    return res.status(400).json({ error: "missing_email", detail: "Use ?email=<cliente@dominio>" });
  }
  const email = emailRaw.toLowerCase();

  try {
    // Tentativa principal: schema completo
    const { rows } = await dbQuery<Row>(
      `
      SELECT id,
             referencia,
             descricao,
             status,
             total,
             metodo,
             created_at,
             pagamento_pagseguros,
             mp_payment_id,
             email,
             cliente_email
        FROM pedido
       WHERE LOWER(COALESCE(email, '')) = $1
          OR LOWER(COALESCE(cliente_email, '')) = $1
       ORDER BY created_at DESC NULLS LAST, id DESC
       LIMIT 100
    `,
      [email]
    );

    if (rows.length) {
      return res.status(200).json(rows.map(normalize));
    }

    // Fallback: schemas antigos (sem algumas colunas)
    const fb = await dbQuery<Row>(
      `
      SELECT id,
             status,
             total,
             created_at,
             pagamento_pagseguros,
             email,
             cliente_email,
             cliente
        FROM pedido
       WHERE LOWER(COALESCE(email, '')) = $1
          OR LOWER(COALESCE(cliente_email, '')) = $1
          OR LOWER(COALESCE(cliente, '')) = $1
       ORDER BY created_at DESC NULLS LAST, id DESC
       LIMIT 100
    `,
      [email]
    );

    return res.status(200).json(
      fb.rows.map((r) =>
        normalize({
          ...r,
          referencia: null, // schema antigo não tem
          metodo: r.pagamento_pagseguros || null,
        })
      )
    );
  } catch (e: any) {
    console.error("[/api/orders] error:", e);
    return res.status(500).json({ error: "db_error", detail: e?.message });
  }
}
