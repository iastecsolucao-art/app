// pages/api/mp/pix.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { dbQuery } from "../../../lib/db";
import { mpPost, MP_WEBHOOK_URL } from "../../../lib/mp";

type Body = {
  amount: number;                // em reais (ex.: 1, 10.5)
  description?: string;
  referenceId?: string;          // ex.: emp1-16999999999
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    cpf?: string;
  };
  // opcional (se você enviar do front): dados de entrega
  shipping?: {
    address?: {
      zip_code?: string;
      street_name?: string;
      street_number?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
      complement?: string;
    };
  };
};

// extrai empresa_id de "emp1-16999..."
function empresaFromRef(ref?: string) {
  if (!ref) return null;
  const m = String(ref).match(/^emp(\d+)-/);
  return m ? Number(m[1]) : null;
}

const makeIdemp = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const QR_FROM_TEXT = (text: string) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(
    text
  )}`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { amount, description, referenceId, payer } = (req.body || {}) as Body;

    // validação mínima
    if (!(amount > 0) || !payer?.email || !referenceId) {
      return res.status(400).json({ error: "invalid_body" });
    }

    const empresa_id = empresaFromRef(referenceId) ?? 1;
    const idempotency = makeIdemp();

    // monta nome do cliente
    const firstName = (payer.first_name || "").trim();
    const lastName  = (payer.last_name  || "").trim();
    const fullName  = `${firstName} ${lastName}`.trim() || null;

    // Corpo do pagamento PIX
    const mpBody: any = {
      transaction_amount: Number(amount),
      description: description ?? "Pedido",
      payment_method_id: "pix",
      notification_url: MP_WEBHOOK_URL,     // garante updates no webhook
      external_reference: referenceId,      // MUITO IMPORTANTE: amarra pagamento ao seu pedido
      payer: {
        email: payer.email,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        identification: payer.cpf
          ? { type: "CPF", number: String(payer.cpf).replace(/\D/g, "") }
          : undefined,
      },
    };

    // (opcional) se você enviou shipping do front e quiser levar algo ao MP:
    if (req.body?.shipping?.address) {
      mpBody.additional_info = {
        items: [{ title: description || "Pedido", quantity: 1, unit_price: Number(amount) }],
        payer: { first_name: firstName || undefined, last_name: lastName || undefined },
        shipments: {
          receiver_address: {
            zip_code: req.body.shipping.address.zip_code,
            street_name: req.body.shipping.address.street_name,
            street_number: req.body.shipping.address.street_number,
            neighborhood: req.body.shipping.address.neighborhood,
            city_name: req.body.shipping.address.city,
            state_name: req.body.shipping.address.state,
            comment: req.body.shipping.address.complement,
          },
        },
      };
    }

    const mp = await mpPost("/v1/payments", mpBody, idempotency);
    if (!mp.ok) {
      // Ex.: 401 Unauthorized use of live credentials / 403 PolicyAgent
      console.error("[MP][pix] erro:", mp.status, mp.data);
      return res.status(mp.status).json({ error: "mp_error", details: mp.data });
    }

    const data = mp.data ?? {};

    // Algumas contas retornam em caminhos diferentes (sandbox/produção)
    const td =
      data?.point_of_interaction?.transaction_data ??
      data?.transaction_data ??
      {};

    // Texto do pix copia-e-cola
    const qr_text: string | null =
      td.qr_code ?? td.qrCode ?? data?.qr_code ?? null;

    // Base64 (nem sempre vem no sandbox)
    const qr_code_base64: string | null =
      td.qr_code_base64 ?? td.qrCodeBase64 ?? null;

    // Se não vier base64, gera a imagem do QR a partir do texto
    const qr_image_url =
      qr_code_base64
        ? `data:image/png;base64,${qr_code_base64}`
        : qr_text
        ? QR_FROM_TEXT(qr_text)
        : null;

    const expires_at: string | null =
      td.expiration_date ?? data?.date_of_expiration ?? null;

    // Página de pagamento do MP (fallback útil)
    const ticket_url: string | null =
      td.ticket_url ?? data?.transaction_details?.external_resource_url ?? null;

    const paymentId = String(data?.id ?? data?.payment?.id ?? "");

    // ====== GRAVA O PEDIDO COM TODOS OS CAMPOS ÚTEIS ======
    // se sua tabela tiver DEFAULT NOW(), pode remover "created_at" do INSERT
    await dbQuery(
      `
      INSERT INTO pedido (
        referencia,
        metodo,
        descricao,
        gateway,
        gateway_id,
        email,
        nome,
        cliente,
        empresa_id,
        total,
        status,
        created_at
      ) VALUES (
        $1,  $2,  $3,  $4,  $5,
        $6,  $7,  $8,  $9, $10,
        $11, NOW()
      )
      `,
      [
        referenceId,            // $1
        "PIX",                  // $2  (ou "mercado_pago", como preferir exibir)
        description ?? null,    // $3
        "mp",                   // $4  (gateway)
        paymentId || null,      // $5  (gateway_id = id do pagamento MP)
        payer.email,            // $6
        fullName,               // $7
        "cliente",              // $8  (livre; use como quiser)
        empresa_id,             // $9
        Number(amount),         // $10
        "CRIADO",               // $11 (status inicial)
      ]
    );

    // (opcional) se você tiver unique em referencia e preferir upsert:
    // CREATE UNIQUE INDEX IF NOT EXISTS ux_pedido_referencia ON pedido(referencia);
    // await dbQuery(`
    //   INSERT ... ON CONFLICT (referencia)
    //   DO UPDATE SET gateway_id = EXCLUDED.gateway_id, email = EXCLUDED.email, nome = EXCLUDED.nome;
    // `, [...]);

    return res.status(201).json({
      chargeId: paymentId || null,
      qr_image_url,     // mostra a imagem
      qr_text,          // botão "Copiar código PIX"
      expires_at,
      ticket_url,       // fallback para abrir a página do MP
      referenceId,      // mantém a referência para "Meus pedidos" e webhook
    });
  } catch (e: any) {
    console.error("[/mp/pix] exception:", e);
    return res
      .status(500)
      .json({ error: "server_error", message: e?.message || "unknown" });
  }
}
