import { pool } from "../../../../lib/db";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const {
        empresa_id,
        queue_id,
        nfe_id,
        chave_nfe,
        pedido_origem,
        fornecedor_cnpj_origem,
        fornecedor_nome_origem,
        itens_origem,
        payload_origem,
      } = req.body;

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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDENTE')
        RETURNING *
        `,
        [
          empresa_id,
          queue_id,
          nfe_id,
          chave_nfe,
          pedido_origem,
          fornecedor_cnpj_origem,
          fornecedor_nome_origem,
          JSON.stringify(itens_origem),
          JSON.stringify(payload_origem),
        ]
      );

      return res.status(200).json({ row: result.rows[0] });
    }

    if (req.method === "PUT") {
      const { id, status_stage, mensagem_status, pedido_erp, fornecedor_erp } = req.body;

      const result = await pool.query(
        `
        UPDATE public.compras_stage
        SET status_stage = $1,
            mensagem_status = $2,
            pedido_erp = $3,
            fornecedor_erp = $4,
            updated_at = NOW()
        WHERE id = $5
        RETURNING *
        `,
        [status_stage, mensagem_status, pedido_erp, fornecedor_erp, id]
      );

      return res.status(200).json({ row: result.rows[0] });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro stage:", err);
    return res.status(500).json({ error: err.message });
  }
}