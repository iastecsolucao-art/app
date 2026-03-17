import pool from "../../../lib/db";

function normalizeInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  try {
    const empresaId = normalizeInteger(req.query.empresa_id);

    if (!empresaId) {
      return res.status(400).json({
        error: "empresa_id é obrigatório",
      });
    }

    const result = await pool.query(
      `
      SELECT
        p.empresa_id,
        e.nome AS empresa_nome,
        e.cliente_codigo,
        p.ativo,
        p.utiliza_integrador,
        p.verificar_pedido_compra,
        p.verificar_fornecedor,
        p.enviar_sem_pedido_para_stage,
        p.enviar_sem_fornecedor_para_stage,
        p.registrar_depara_sempre,
        p.validar_itens_erp,
        p.bloquear_sem_itens,
        p.integrar_status_erp,
        p.status_inicial_fila,
        p.status_sucesso,
        p.status_erro,
        p.status_sem_pedido,
        p.status_fornecedor_divergente,
        p.status_depara_pendente,
        p.status_entrada_realizada,
        p.observacoes,
        p.updated_at
      FROM public.integrador_parametros p
      INNER JOIN public.empresa e
        ON e.id = p.empresa_id
      WHERE p.empresa_id = $1
      LIMIT 1
      `,
      [empresaId]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        error: "Parâmetros do integrador não encontrados para a empresa",
      });
    }

    return res.status(200).json({
      success: true,
      parametros: result.rows[0],
    });
  } catch (e) {
    console.error("Erro em GET /api/integrador/parametros-runtime:", e);
    return res.status(500).json({
      error: "Erro ao buscar parâmetros runtime do integrador",
      details: e?.message || String(e),
    });
  }
}