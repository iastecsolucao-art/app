import { pool } from "../../../../lib/db";

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
        cnpj_fornecedor,
        queue_id,
        nfe_id,
        chave_nfe,
        pedido_origem,
        pedido_erp,
        stage_id,
        itens,
      } = req.body || {};

      if (!Array.isArray(itens)) {
        return res.status(400).json({ error: "itens deve ser um array" });
      }

      const results = [];

      for (const item of itens) {
        const {
          cprod_origem,
          xprod_origem,
          ncm_origem,
          cfop_origem,
          n_item,
          codigo_produto_erp,
          status_map,
          item_ok,
        } = item || {};

        const existing = await pool.query(
          `
          SELECT *
          FROM public.nfe_item_erp_map
          WHERE empresa_id = $1
            AND COALESCE(cnpj_fornecedor, '') = COALESCE($2, '')
            AND COALESCE(cprod_origem, '') = COALESCE($3, '')
            AND ativo = TRUE
          ORDER BY id DESC
          LIMIT 1
          `,
          [empresa_id, cnpj_fornecedor || null, cprod_origem || null]
        );

        if (existing.rows.length > 0) {
          const map = existing.rows[0];

          results.push({
            ...item,
            codigo_produto_erp: map.codigo_produto_erp,
            map_aplicado: true,
            status_map: "MAP_APLICADO",
          });

          await pool.query(
            `
            UPDATE public.nfe_item_erp_map
            SET
              queue_id = COALESCE($1, queue_id),
              nfe_id = COALESCE($2, nfe_id),
              chave_nfe = COALESCE($3, chave_nfe),
              pedido_origem = COALESCE($4, pedido_origem),
              pedido_erp = COALESCE($5, pedido_erp),
              n_item = COALESCE($6, n_item),
              stage_id = COALESCE($7, stage_id),
              item_ok = COALESCE($8, item_ok),
              origem_aplicacao = COALESCE($9, origem_aplicacao),
              map_aplicado_automaticamente = TRUE,
              updated_at = NOW()
            WHERE id = $10
              AND empresa_id = $11
            `,
            [
              queue_id || null,
              nfe_id || null,
              chave_nfe || null,
              pedido_origem || null,
              pedido_erp || null,
              n_item || null,
              stage_id || null,
              item_ok ?? null,
              "COMPRA",
              map.id,
              empresa_id,
            ]
          );

          continue;
        }

        const inserted = await pool.query(
          `
          INSERT INTO public.nfe_item_erp_map (
            empresa_id,
            queue_id,
            nfe_id,
            chave_nfe,
            pedido_origem,
            pedido_erp,
            stage_id,
            cnpj_fornecedor,
            cprod_origem,
            xprod_origem,
            ncm_origem,
            cfop_origem,
            n_item,
            codigo_produto_erp,
            status_map,
            item_ok,
            origem_aplicacao,
            map_aplicado_automaticamente
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,FALSE
          )
          RETURNING *
          `,
          [
            empresa_id,
            queue_id || null,
            nfe_id || null,
            chave_nfe || null,
            pedido_origem || null,
            pedido_erp || null,
            stage_id || null,
            cnpj_fornecedor || null,
            cprod_origem || null,
            xprod_origem || null,
            ncm_origem || null,
            cfop_origem || null,
            n_item || null,
            codigo_produto_erp || null,
            status_map || "PENDENTE",
            item_ok ?? null,
            "COMPRA",
          ]
        );

        results.push({
          ...item,
          id: inserted.rows[0].id,
          map_aplicado: false,
          status_map: status_map || "PENDENTE",
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