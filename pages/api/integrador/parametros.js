import { dbQuery } from "../../../lib/db";

const BOOLEAN_FIELDS = [
  "ativo",
  "utiliza_integrador",
  "verificar_pedido_compra",
  "verificar_fornecedor",
  "enviar_sem_pedido_para_stage",
  "enviar_sem_fornecedor_para_stage",
  "registrar_depara_sempre",
  "validar_itens_erp",
  "bloquear_sem_itens",
  "integrar_status_erp",
];

const STATUS_FIELDS = [
  "status_inicial_fila",
  "status_sucesso",
  "status_erro",
  "status_sem_pedido",
  "status_sem_fornecedor",
  "status_fornecedor_divergente",
  "status_depara_pendente",
  "status_entrada_realizada",
];

function toBoolean(value, defaultValue = false) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return defaultValue;
}

function normalizeString(value, fallback = null) {
  if (value == null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function normalizeInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeCnpjsDestinatarios(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => onlyDigits(item)).filter(Boolean))];
  }

  if (typeof value === "string") {
    return [
      ...new Set(
        value
          .split(/\r?\n|,|;/)
          .map((item) => onlyDigits(item))
          .filter(Boolean)
      ),
    ];
  }

  return [];
}

function buildDefaultRow(empresa) {
  return {
    id: null,
    empresa_id: empresa?.id ?? null,
    empresa_nome: empresa?.nome ?? null,
    cnpj: empresa?.cnpj ?? null,
    email: empresa?.email ?? null,
    ativo: true,
    utiliza_integrador: true,
    verificar_pedido_compra: true,
    verificar_fornecedor: true,
    enviar_sem_pedido_para_stage: true,
    enviar_sem_fornecedor_para_stage: true,
    registrar_depara_sempre: true,
    validar_itens_erp: true,
    bloquear_sem_itens: true,
    integrar_status_erp: true,
    status_inicial_fila: "PENDENTE",
    status_sucesso: "PROCESSADO",
    status_erro: "ERRO",
    status_sem_pedido: "SEM_PEDIDO",
    status_sem_fornecedor: "SEM_FORNECEDOR",
    status_fornecedor_divergente: "FORNECEDOR_DIVERGENTE",
    status_depara_pendente: "DEPARA_PENDENTE",
    status_entrada_realizada: "ENTRADA_REALIZADA",
    observacoes: null,
    cnpjs_destinatarios: [],
    serie_nfe: null,
    serie_nfse: null,
    created_at: null,
    updated_at: null,
    is_default: true,
  };
}

function normalizeBody(body = {}) {
  const data = {
    empresa_id: normalizeInteger(body.empresa_id),
    observacoes: normalizeString(body.observacoes, null),
    cnpjs_destinatarios: normalizeCnpjsDestinatarios(body.cnpjs_destinatarios),
    serie_nfe: normalizeString(body.serie_nfe, null),
    serie_nfse: normalizeString(body.serie_nfse, null),
  };

  for (const field of BOOLEAN_FIELDS) {
    data[field] = toBoolean(body[field], true);
  }

  for (const field of STATUS_FIELDS) {
    data[field] = normalizeString(body[field], null);
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const empresaId = normalizeInteger(req.query.empresa_id);

      if (!empresaId) {
        return res.status(400).json({
          error: "empresa_id é obrigatório",
        });
      }

      const empresaResult = await dbQuery(
        `
        SELECT id, nome, cnpj, email
        FROM public.empresa
        WHERE id = $1
        LIMIT 1
        `,
        [empresaId]
      );

      if (!empresaResult.rowCount) {
        return res.status(404).json({
          error: "Empresa não encontrada",
        });
      }

      const result = await dbQuery(
        `
        SELECT
          p.id,
          p.empresa_id,
          e.nome AS empresa_nome,
          e.cnpj,
          e.email,
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
          p.status_sem_fornecedor,
          p.status_fornecedor_divergente,
          p.status_depara_pendente,
          p.status_entrada_realizada,
          p.observacoes,
          COALESCE(p.cnpjs_destinatarios, '{}') AS cnpjs_destinatarios,
          p.serie_nfe,
          p.serie_nfse,
          p.created_at,
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
        return res.status(200).json({
          row: buildDefaultRow(empresaResult.rows[0]),
        });
      }

      return res.status(200).json({
        row: {
          ...result.rows[0],
          cnpjs_destinatarios: result.rows[0].cnpjs_destinatarios || [],
          serie_nfe: result.rows[0].serie_nfe || "",
          serie_nfse: result.rows[0].serie_nfse || "",
          is_default: false,
        },
      });
    } catch (e) {
      console.error("Erro em GET /api/integrador/parametros:", {
        message: e?.message,
        stack: e?.stack,
      });

      return res.status(500).json({
        error: "Erro ao buscar parâmetros do integrador",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "POST") {
    try {
      const data = normalizeBody(req.body);

      if (!data.empresa_id) {
        return res.status(400).json({
          error: "empresa_id é obrigatório",
        });
      }

      for (const field of STATUS_FIELDS) {
        if (!data[field]) {
          return res.status(400).json({
            error: `Campo obrigatório: ${field}`,
          });
        }
      }

      const empresaResult = await dbQuery(
        `
        SELECT id, nome, cnpj, email
        FROM public.empresa
        WHERE id = $1
        LIMIT 1
        `,
        [data.empresa_id]
      );

      if (!empresaResult.rowCount) {
        return res.status(404).json({
          error: "Empresa não encontrada",
        });
      }

      const result = await dbQuery(
        `
        INSERT INTO public.integrador_parametros (
          empresa_id,
          ativo,
          utiliza_integrador,
          verificar_pedido_compra,
          verificar_fornecedor,
          enviar_sem_pedido_para_stage,
          enviar_sem_fornecedor_para_stage,
          registrar_depara_sempre,
          validar_itens_erp,
          bloquear_sem_itens,
          integrar_status_erp,
          status_inicial_fila,
          status_sucesso,
          status_erro,
          status_sem_pedido,
          status_sem_fornecedor,
          status_fornecedor_divergente,
          status_depara_pendente,
          status_entrada_realizada,
          observacoes,
          cnpjs_destinatarios,
          serie_nfe,
          serie_nfse,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,NOW(),NOW()
        )
        ON CONFLICT (empresa_id)
        DO UPDATE SET
          ativo = EXCLUDED.ativo,
          utiliza_integrador = EXCLUDED.utiliza_integrador,
          verificar_pedido_compra = EXCLUDED.verificar_pedido_compra,
          verificar_fornecedor = EXCLUDED.verificar_fornecedor,
          enviar_sem_pedido_para_stage = EXCLUDED.enviar_sem_pedido_para_stage,
          enviar_sem_fornecedor_para_stage = EXCLUDED.enviar_sem_fornecedor_para_stage,
          registrar_depara_sempre = EXCLUDED.registrar_depara_sempre,
          validar_itens_erp = EXCLUDED.validar_itens_erp,
          bloquear_sem_itens = EXCLUDED.bloquear_sem_itens,
          integrar_status_erp = EXCLUDED.integrar_status_erp,
          status_inicial_fila = EXCLUDED.status_inicial_fila,
          status_sucesso = EXCLUDED.status_sucesso,
          status_erro = EXCLUDED.status_erro,
          status_sem_pedido = EXCLUDED.status_sem_pedido,
          status_sem_fornecedor = EXCLUDED.status_sem_fornecedor,
          status_fornecedor_divergente = EXCLUDED.status_fornecedor_divergente,
          status_depara_pendente = EXCLUDED.status_depara_pendente,
          status_entrada_realizada = EXCLUDED.status_entrada_realizada,
          observacoes = EXCLUDED.observacoes,
          cnpjs_destinatarios = EXCLUDED.cnpjs_destinatarios,
          serie_nfe = EXCLUDED.serie_nfe,
          serie_nfse = EXCLUDED.serie_nfse,
          updated_at = NOW()
        RETURNING
          id,
          empresa_id,
          ativo,
          utiliza_integrador,
          verificar_pedido_compra,
          verificar_fornecedor,
          enviar_sem_pedido_para_stage,
          enviar_sem_fornecedor_para_stage,
          registrar_depara_sempre,
          validar_itens_erp,
          bloquear_sem_itens,
          integrar_status_erp,
          status_inicial_fila,
          status_sucesso,
          status_erro,
          status_sem_pedido,
          status_sem_fornecedor,
          status_fornecedor_divergente,
          status_depara_pendente,
          status_entrada_realizada,
          observacoes,
          COALESCE(cnpjs_destinatarios, '{}') AS cnpjs_destinatarios,
          serie_nfe,
          serie_nfse,
          created_at,
          updated_at
        `,
        [
          data.empresa_id,
          data.ativo,
          data.utiliza_integrador,
          data.verificar_pedido_compra,
          data.verificar_fornecedor,
          data.enviar_sem_pedido_para_stage,
          data.enviar_sem_fornecedor_para_stage,
          data.registrar_depara_sempre,
          data.validar_itens_erp,
          data.bloquear_sem_itens,
          data.integrar_status_erp,
          data.status_inicial_fila,
          data.status_sucesso,
          data.status_erro,
          data.status_sem_pedido,
          data.status_sem_fornecedor,
          data.status_fornecedor_divergente,
          data.status_depara_pendente,
          data.status_entrada_realizada,
          data.observacoes,
          data.cnpjs_destinatarios,
          data.serie_nfe,
          data.serie_nfse,
        ]
      );

      return res.status(200).json({
        success: true,
        row: {
          ...result.rows[0],
          cnpjs_destinatarios: result.rows[0].cnpjs_destinatarios || [],
          serie_nfe: result.rows[0].serie_nfe || "",
          serie_nfse: result.rows[0].serie_nfse || "",
          empresa_nome: empresaResult.rows[0].nome,
          cnpj: empresaResult.rows[0].cnpj,
          email: empresaResult.rows[0].email,
          is_default: false,
        },
      });
    } catch (e) {
      console.error("Erro em POST /api/integrador/parametros:", {
        message: e?.message,
        stack: e?.stack,
      });

      return res.status(500).json({
        error: "Erro ao salvar parâmetros do integrador",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "PUT") {
    try {
      const result = await dbQuery(
        `
        SELECT id, nome, cnpj, email
        FROM public.empresa
        ORDER BY nome ASC, id ASC
        `
      );

      return res.status(200).json({
        rows: result.rows,
      });
    } catch (e) {
      console.error("Erro em PUT /api/integrador/parametros:", {
        message: e?.message,
        stack: e?.stack,
      });

      return res.status(500).json({
        error: "Erro ao buscar empresas",
        details: e?.message || String(e),
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PUT"]);
  return res.status(405).json({
    error: `Método ${req.method} não permitido`,
  });
}