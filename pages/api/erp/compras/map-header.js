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

      return res.status(200).json({
        id: result.rows[0].id,
        row: result.rows[0],
      });
    }

    return res.status(405).json({ error: "Método não permitido" });
  } catch (err) {
    console.error("Erro map-header:", err);
    return res.status(500).json({ error: err.message });
  }
}