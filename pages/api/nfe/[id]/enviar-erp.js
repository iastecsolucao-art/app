import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  const client = await pool.connect();

  try {
    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const id = Number.parseInt(String(rawId), 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    await client.query("BEGIN");

    const docRes = await client.query(
      `
      SELECT
        id,
        chave_nfe,
        n_nf,
        serie,
        COALESCE(status_erp, 2) AS status_erp
      FROM public.nfe_document
      WHERE id = $1
      FOR UPDATE
      `,
      [id]
    );

    if (!docRes.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "NFe não encontrada" });
    }

    const doc = docRes.rows[0];
    const statusAtual = Number(doc.status_erp ?? 2);

    if (statusAtual !== 2) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Somente NF-es com status 2 podem ser enviadas para o ERP",
      });
    }

    await client.query(
      `
      INSERT INTO public.nfe_erp_queue (
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
        'PENDENTE',
        0,
        NULL,
        NULL,
        NULL,
        NULL,
        NOW(),
        NOW()
      )
      ON CONFLICT (nfe_id)
      DO UPDATE SET
        status = 'PENDENTE',
        updated_at = NOW(),
        last_error = NULL,
        reservado_em = NULL,
        reservado_por = NULL
      `,
      [id]
    );

    await client.query(
      `
      UPDATE public.nfe_document
      SET status_erp = 1
      WHERE id = $1
      `,
      [id]
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "NF enviada para fila do ERP com sucesso.",
      nfe_id: id,
      status_erp: 1,
      fila_status: "PENDENTE",
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("Erro em POST /api/nfe/[id]/enviar-erp:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao enviar NFe para fila do ERP",
      details: e?.message || String(e),
    });
  } finally {
    client.release();
  }
}