// pages/api/mp/pix.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { dbQuery } from "../../../lib/db";
import { mpPost } from "../../../lib/mp";

type Address = {
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
};

type Body = {
  amount: number;                 // em reais (ex.: 1, 10.5)
  description?: string;
  referenceId?: string;           // ex.: emp1-16999999999
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    cpf?: string;
    phone?: string;
  };
  customer?: {
    nome?: string;
    email?: string;
    telefone?: string;
  };
  entrega?: {
    habilitada?: boolean;
    endereco?: Address;
  };
};

// extrai empresa_id de "emp1-16999..."
function empresaFromRef(ref?: string) {
  if (!ref) return null;
  const m = String(ref).match(/^emp(\d+)-/);
  return m ? Number(m[1]) : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { amount, description, referenceId, payer, customer, entrega } =
      (req.body || {}) as Body;

    if (!amount || !payer?.email || !referenceId) {
      return res.status(400).json({ error: "invalid_body" });
    }

    const empresa_id = empresaFromRef(referenceId) || 1;
    const idemp = crypto.randomUUID();

    // ==== Mercado Pago (PIX – sandbox/produção conforme seu .env) ====
    const mpBody: any = {
      transaction_amount: Number(amount),
      description: description ?? "Pedido",
      payment_method_id: "pix",
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: payer.cpf
          ? { type: "CPF", number: String(payer.cpf).replace(/\D/g, "") }
          : undefined,
      },
    };

    const mp = await mpPost("/v1/payments", mpBody, idemp);
    if (!mp.ok) {
      console.error("[MP][pix] erro:", mp.status, mp.data);
      return res.status(mp.status).json({
        error: "mp_error",
        details: mp.data,
      });
    }

    // ==== Dados para UI ====
    const paymentId = mp.data.id;
    const poi = mp.data.point_of_interaction?.transaction_data || {};
    const qr_code = poi.qr_code || null;
    const qr_code_base64 = poi.qr_code_base64 || null;
    const expires_at = poi?.expiration_date || mp.data.date_of_expiration || null;

    // ==== Dados do cliente/entrega para gravação ====
    const clienteNome =
      customer?.nome ||
      `${payer.first_name || ""} ${payer.last_name || ""}`.trim() ||
      "cliente";

    const clienteEmail = customer?.email || payer.email || null;
    const clienteTelefone = customer?.telefone || payer.phone || null;

    const entregaJson =
      entrega?.habilitada && entrega?.endereco
        ? JSON.stringify({
            habilitada: true,
            ...entrega.endereco,
          })
        : JSON.stringify({ habilitada: false });

    // ==== Grava pedido ====
    // Observação: mantenho as suas colunas já existentes (pelo seu print).
    // Se não tiver alguma coluna, crie com a migração acima.
    await dbQuery(
      `
      INSERT INTO pedido
        (empresa_id, total, status, created_at,
         pagamento_pagseguros, cliente, cliente_email, cliente_telefone,
         referencia, mp_payment_id, entrega_json)
      VALUES ($1, $2, $3, NOW(),
              $4, $5, $6, $7,
              $8, $9, $10)
      `,
      [
        empresa_id,
        Number(amount),
        "CRIADO",
        "mercado_pago",
        clienteNome,
        clienteEmail,
        clienteTelefone,
        referenceId,
        String(paymentId),
        entregaJson,
      ]
    );

    return res.status(201).json({
      id: String(paymentId),
      status: mp.data.status,
      qr_code,
      qr_code_base64,
      ticket_url: poi?.ticket_url || null,
      date_of_expiration: expires_at,
    });
  } catch (e: any) {
    console.error("[/mp/pix] exception:", e);
    return res.status(500).json({ error: "server_error", message: e?.message });
  }
}
