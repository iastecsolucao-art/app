import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { pool } from "../../../../lib/dbbck";

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const empresa_id = session?.user?.empresa_id;

    if (!empresa_id) {
      return res.status(403).json({ error: "empresa_id não encontrado na sessão" });
    }

    if (req.method === "POST") {
      const {
        queue_id,
        stage_id,
        nfe_id,
        chave_nfe,
        pedido_origem,
        pedido_erp,
        fornecedor_origem,
        fornecedor_cnpj_origem,
        fornecedor_erp,
        status_map,
        observacao,
      } = req.body || {};

      const result = await pool.query(
        `
        INSERT INTO public.compras_map_header (
          empresa_id,
          queue_id,
          stage_id,
          nfe_id,
          chave_nfe,
          pedido_origem,
          pedido_erp,
          fornecedor_origem,
          fornecedor_cnpj_origem,
          fornecedor_erp,
          status_map,
          observacao
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        RETURNING *
        `,
        [
          empresa_id,
          queue_id || null,
          stage_id || null,
          nfe_id || null,
          chave_nfe || null,
          pedido_origem || null,
          pedido_erp || null,
          fornecedor_origem || null,
          fornecedor_cnpj_origem || null,
          fornecedor_erp || null,
          status_map || "REGISTRADO",
          observacao || null,
        ]
      );

      return res.status(200).json({ row: result.rows[0] });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro map-header:", err);
    return res.status(500).json({ error: err.message });
  }
}