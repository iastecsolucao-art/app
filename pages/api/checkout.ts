import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ajuste para o endpoint da API PagBank / PagSeguro que você usa.
// Aqui deixo um exemplo genérico (Orders + Charges API).
const PAGSEGURO_BASE = process.env.PAGSEGURO_BASE || "https://sandbox.api.pagseguro.com";
const PAGSEGURO_TOKEN = process.env.PAGSEGURO_TOKEN || ""; // token de integração (Bearer)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empresaId, cliente, items } = req.body || {};
  if (!empresaId || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "Dados inválidos" });

  const client = await pool.connect();
  try {
    // 1) cria pedido local
    const total = items.reduce((acc, it) => acc + Number(it.preco_unit) * Number(it.quantidade), 0);

    const { rows: pedRows } = await client.query(
      `INSERT INTO pedido (empresa_id, total, status)
       VALUES ($1, $2, 'CRIADO') RETURNING id`,
      [empresaId, total]
    );
    const pedidoId = pedRows[0].id;

    // itens
    for (const it of items) {
      await client.query(
        `INSERT INTO pedido_item (pedido_id, produto_id, descricao, quantidade, preco_unit, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [pedidoId, it.produtoId, it.descricao, it.quantidade, it.preco_unit, it.quantidade * it.preco_unit]
      );
    }

    // 2) cria ordem no PagSeguro (exemplo simplificado)
    // troque o body conforme o fluxo (PIX / cartão / boleto).
    const orderBody = {
      reference_id: String(pedidoId),
      customer: {
        name: cliente?.nome || "Cliente",
        email: cliente?.email || "sem@email.com",
        phones: cliente?.telefone ? [{ country: "55", area: "11", number: cliente.telefone.replace(/\D/g, ""), type: "MOBILE" }] : undefined,
      },
      items: items.map((i) => ({
        name: i.descricao,
        quantity: i.quantidade,
        unit_amount: Math.round(Number(i.preco_unit) * 100), // em centavos
      })),
      // exemplo PIX (gera QRCode/CopyCode). Para cartão, troque por "charges" com card.
      charges: [
        { amount: { value: Math.round(total * 100) }, payment_method: { type: "PIX" } }
      ]
    };

    const r = await fetch(`${PAGSEGURO_BASE}/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAGSEGURO_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderBody),
    });

    const pg = await r.json();
    // guarde a resposta
    await client.query(
      `INSERT INTO pagamento_pagseguro (pedido_id, provider_ref, status, raw_response)
       VALUES ($1,$2,$3,$4)`,
      [pedidoId, pg?.id || null, pg?.status || 'CRIADO', pg]
    );

    // atualize o status inicial do pedido com o que voltar (opcional)
    await client.query(`UPDATE pedido SET status = $2 WHERE id = $1`, [pedidoId, pg?.status || 'CRIADO']);

    return res.status(201).json({
      pedidoId,
      status: pg?.status || "CRIADO",
      providerId: pg?.id,
      mensagem: "Pedido criado. Conclua o pagamento."
      // para PIX: pg?.charges?.[0]?.payment_method?.qr_codes[0]?.links[0]?.href etc.
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro ao processar checkout" });
  } finally {
    client.release();
  }
}
