import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._erpPgPool;

if (!pool) {
  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  global._erpPgPool = pool;
}

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

function normalizeBody(body = {}) {
  const data = {
    empresa_id: normalizeInteger(body.empresa_id),
    observacoes: normalizeString(body.observacoes, null),
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

      const result = await pool.query(
        `
        SELECT
          p.id,
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
        return res.status(404).json({
          error: "Parâmetros não encontrados para a empresa",
        });
      }

      return res.status(200).json({
        row: result.rows[0],
      });
    } catch (e) {
      console.error("Erro em GET /api/integrador/parametros:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        table: e?.table,
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

      const empresaResult = await pool.query(
        `
        SELECT id, nome, cliente_codigo
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

      const result = await pool.query(
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
          status_fornecedor_divergente,
          status_depara_pendente,
          status_entrada_realizada,
          observacoes,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,$19,
          NOW(),NOW()
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
          status_fornecedor_divergente = EXCLUDED.status_fornecedor_divergente,
          status_depara_pendente = EXCLUDED.status_depara_pendente,
          status_entrada_realizada = EXCLUDED.status_entrada_realizada,
          observacoes = EXCLUDED.observacoes,
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
          status_fornecedor_divergente,
          status_depara_pendente,
          status_entrada_realizada,
          observacoes,
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
          data.status_fornecedor_divergente,
          data.status_depara_pendente,
          data.status_entrada_realizada,
          data.observacoes,
        ]
      );

      return res.status(200).json({
        success: true,
        row: {
          ...result.rows[0],
          empresa_nome: empresaResult.rows[0].nome,
          cliente_codigo: empresaResult.rows[0].cliente_codigo,
        },
      });
    } catch (e) {
      console.error("Erro em POST /api/integrador/parametros:", {
        message: e?.message,
        stack: e?.stack,
        code: e?.code,
        detail: e?.detail,
        hint: e?.hint,
        table: e?.table,
      });

      return res.status(500).json({
        error: "Erro ao salvar parâmetros do integrador",
        details: e?.message || String(e),
      });
    }
  }

  if (req.method === "PUT") {
    try {
      const result = await pool.query(
        `
        SELECT id, nome, cliente_codigo
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