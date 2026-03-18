import { pool } from "../../../../lib/dbbck";

function getEmpresaIdFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  const expectedToken = process.env.API_TOKEN;

  if (!authHeader.startsWith("Bearer ")) {
    return { error: "Token não informado" };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!expectedToken || token !== expectedToken) {
    return { error: "Token inválido" };
  }

  const empresaId =
    req.body?.empresa_id ||
    req.query?.empresa_id ||
    req.headers["x-empresa-id"];

  if (!empresaId) {
    return { error: "empresa_id não informado" };
  }

  return { empresa_id: Number(empresaId) };
}

export default async function handler(req, res) {
  try {
    const auth = getEmpresaIdFromRequest(req);

    if (auth.error) {
      return res.status(401).json({ error: auth.error });
    }

    const { empresa_id } = auth;

    if (req.method === "POST") {
      const {
        queue_id,
        nfe_id,
        chave_nfe,
        pedido_origem,
        fornecedor_cnpj_origem,
        fornecedor_nome_origem,
        itens_origem,
        payload_origem,
        status_stage,
      } = req.body || {};

      const result = await pool.query(
        `
        INSERT INTO public.compras_stage (
          empresa_id,
          queue_id,
          nfe_id,
          chave_nfe,
          pedido_origem,
          fornecedor_cnpj_origem,
          fornecedor_nome_origem,
          itens_origem,
          payload_origem,
          status_stage
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
        `,
        [
          empresa_id,
          queue_id || null,
          nfe_id || null,
          chave_nfe || null,
          pedido_origem || null,
          fornecedor_cnpj_origem || null,
          fornecedor_nome_origem || null,
          JSON.stringify(itens_origem || []),
          JSON.stringify(payload_origem || {}),
          status_stage || "PENDENTE",
        ]
      );

      return res.status(200).json({ row: result.rows[0] });
    }

    if (req.method === "PUT") {
      const {
        id,
        status_stage,
        mensagem_status,
        pedido_erp,
        fornecedor_erp,
        resposta_erp,
      } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: "id é obrigatório" });
      }

      const result = await pool.query(
        `
        UPDATE public.compras_stage
        SET status_stage = COALESCE($1, status_stage),
            mensagem_status = COALESCE($2, mensagem_status),
            pedido_erp = COALESCE($3, pedido_erp),
            fornecedor_erp = COALESCE($4, fornecedor_erp),
            resposta_erp = COALESCE($5, resposta_erp),
            updated_at = NOW()
        WHERE id = $6
          AND empresa_id = $7
        RETURNING *
        `,
        [
          status_stage || null,
          mensagem_status || null,
          pedido_erp || null,
          fornecedor_erp || null,
          resposta_erp ? JSON.stringify(resposta_erp) : null,
          id,
          empresa_id,
        ]
      );

      if (!result.rows.length) {
        return res.status(404).json({ error: "Stage não encontrada para esta empresa" });
      }

      return res.status(200).json({ row: result.rows[0] });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro stage:", err);
    return res.status(500).json({ error: err.message });
  }
}