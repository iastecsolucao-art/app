import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida");
}

let pool = global._nfePgPool;

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

  global._nfePgPool = pool;
}

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  const client = await pool.connect();

  try {
    const rawId = firstValue(req.query.id);
    const rawEmpresaId =
      firstValue(req.query.empresa_id) ??
      req.body?.empresa_id;

    const idInt = Number.parseInt(String(rawId), 10);
    const empresaIdInt = Number.parseInt(String(rawEmpresaId), 10);

    if (!Number.isInteger(idInt) || idInt <= 0) {
      return res.status(400).json({
        error: "ID inválido",
      });
    }

    if (!Number.isInteger(empresaIdInt) || empresaIdInt <= 0) {
      return res.status(400).json({
        error: "empresa_id inválido",
      });
    }

    await client.query("BEGIN");

    const docRes = await client.query(
      `
      SELECT
        id,
        empresa_id,
        chave_nfe,
        n_nf,
        serie,
        COALESCE(status_erp, 2) AS status_erp
      FROM public.nfe_document
      WHERE id = $1
        AND empresa_id = $2
      FOR UPDATE
      `,
      [idInt, empresaIdInt]
    );

    if (!docRes.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Documento não encontrado para esta empresa",
      });
    }

    const document = docRes.rows[0];

    const queueRes = await client.query(
      `
      SELECT
        id,
        empresa_id,
        status,
        tentativas
      FROM public.nfe_erp_queue
      WHERE nfe_id = $1
        AND empresa_id = $2
      FOR UPDATE
      `,
      [idInt, empresaIdInt]
    );

    if (!queueRes.rowCount) {
      await client.query(
        `
        INSERT INTO public.nfe_erp_queue (
          empresa_id,
          nfe_id,
          status,
          tentativas,
          last_error,
          integrado_em,
          reservado_em,
          reservado_por,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          'PENDENTE',
          0,
          NULL,
          NULL,
          NULL,
          NULL,
          NOW(),
          NOW()
        )
        `,
        [empresaIdInt, idInt]
      );
    } else {
      await client.query(
        `
        UPDATE public.nfe_erp_queue
        SET
          status = 'PENDENTE',
          last_error = NULL,
          integrado_em = NULL,
          reservado_em = NULL,
          reservado_por = NULL,
          updated_at = NOW()
        WHERE nfe_id = $1
          AND empresa_id = $2
        `,
        [idInt, empresaIdInt]
      );
    }

    await client.query(
      `
      UPDATE public.nfe_document
      SET
        status_erp = 2,
        erp_stage_status = NULL,
        erp_stage_msg = NULL,
        erp_stage_updated_at = NOW()
      WHERE id = $1
        AND empresa_id = $2
      `,
      [idInt, empresaIdInt]
    );

    await client.query(
      `
      INSERT INTO public.nfe_erp_log (
        empresa_id,
        nfe_id,
        tipo_evento,
        mensagem,
        detalhes,
        created_at
      )
      VALUES (
        $1,
        $2,
        'REPROCESSAR',
        $3,
        $4,
        NOW()
      )
      `,
      [
        empresaIdInt,
        idInt,
        "NF marcada para reprocessamento ERP",
        `Chave ${document.chave_nfe || "-"} | NF ${document.n_nf || "-"} série ${document.serie || "-"}`,
      ]
    ).catch(() => null);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "NF marcada para reprocessamento com sucesso.",
      empresa_id: empresaIdInt,
      nfe_id: idInt,
      chave_nfe: document.chave_nfe,
      status_erp: 2,
      fila_status: "PENDENTE",
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Erro em POST /api/nfe/[id]/reprocessar-erp:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao marcar NF para reprocessamento",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}