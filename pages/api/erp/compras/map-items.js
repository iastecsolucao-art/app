import { pool } from "@/lib/db";

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const { empresa_id, cnpj_fornecedor, itens } = req.body;

      const results = [];

      for (const item of itens) {
        const { cprod_origem, xprod_origem, ncm_origem, cfop_origem, n_item } = item;

        // 🔍 BUSCA MAP EXISTENTE
        const existing = await pool.query(
          `
          SELECT *
          FROM public.nfe_item_erp_map
          WHERE cnpj_fornecedor = $1
            AND cprod_origem = $2
            AND ativo = TRUE
          LIMIT 1
          `,
          [cnpj_fornecedor, cprod_origem]
        );

        if (existing.rows.length > 0) {
          const map = existing.rows[0];

          results.push({
            ...item,
            codigo_produto_erp: map.codigo_produto_erp,
            map_aplicado: true,
          });

          continue;
        }

        // 🔴 NÃO TEM MAP → REGISTRA PENDENTE
        await pool.query(
          `
          INSERT INTO public.nfe_item_erp_map (
            empresa_id,
            cnpj_fornecedor,
            cprod_origem,
            xprod_origem,
            ncm_origem,
            cfop_origem,
            n_item,
            status_map
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDENTE')
          `,
          [
            empresa_id,
            cnpj_fornecedor,
            cprod_origem,
            xprod_origem,
            ncm_origem,
            cfop_origem,
            n_item,
          ]
        );

        results.push({
          ...item,
          map_aplicado: false,
        });
      }

      return res.status(200).json({ itens: results });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro map-items:", err);
    return res.status(500).json({ error: err.message });
  }
}