import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

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

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
}

function extractPedidos(texto) {
  const s = String(texto || "");
  const patterns = [
    /PEDIDO\s+DE\s+COMPRA\s+(\d+)/gi,
    /PEDIDO\(S\)\s*:\s*(\d+)/gi,
    /PEDIDO\s+IB\s*:\s*(\d+)/gi,
    /PEDIDO\s*:\s*(\d+)/gi,
  ];

  const found = new Set();

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(s)) !== null) {
      if (match?.[1]) {
        found.add(match[1].trim());
      }
    }
  }

  return Array.from(found);
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

    const rawEmpresaId =
      req.body?.empresa_id ??
      req.query?.empresa_id ??
      firstValue(req.query.empresa_id);

    const empresaId = Number.parseInt(String(rawEmpresaId), 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      return res.status(400).json({ error: "empresa_id inválido" });
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
        infcpl,
        COALESCE(status_erp, 2) AS status_erp
      FROM public.nfe_document
      WHERE id = $1
        AND empresa_id = $2
      FOR UPDATE
      `,
      [id, empresaId]
    );

    if (!docRes.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "NFe não encontrada para esta empresa" });
    }

    const doc = docRes.rows[0];
    const statusAtual = Number(doc.status_erp ?? 2);

    if (statusAtual !== 2) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Somente NF-es com status 2 podem ser enviadas para o ERP",
        details: `Status atual: ${statusAtual}`,
      });
    }

    const queueRes = await client.query(
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
      ON CONFLICT (nfe_id)
      DO UPDATE SET
        empresa_id = EXCLUDED.empresa_id,
        status = 'PENDENTE',
        last_error = NULL,
        integrado_em = NULL,
        reservado_em = NULL,
        reservado_por = NULL,
        updated_at = NOW()
      RETURNING id, empresa_id, nfe_id, status
      `,
      [empresaId, id]
    );

    await client.query(
      `
      UPDATE public.nfe_document
      SET status_erp = 1
      WHERE id = $1
        AND empresa_id = $2
      `,
      [id, empresaId]
    );

    const pedidos = extractPedidos(doc.infcpl);
    let comprasCriadas = 0;
    let comprasAtualizadas = 0;

    if (pedidos.length > 0) {
      for (const pedido of pedidos) {
        const existingRes = await client.query(
          `
          SELECT id
          FROM public.erp_compra_queue
          WHERE empresa_id = $1
            AND nfe_id = $2
            AND pedido = $3
          LIMIT 1
          `,
          [empresaId, id, pedido]
        );

        if (existingRes.rowCount > 0) {
          await client.query(
            `
            UPDATE public.erp_compra_queue
            SET
              origem_texto = $2,
              status_integracao = 'PENDENTE',
              mensagem_integracao = 'Reenfileirado automaticamente no envio ao ERP',
              tentativas = 0,
              reservado_em = NULL,
              reservado_por = NULL,
              integrado_em = NULL,
              updated_at = NOW()
            WHERE id = $1
            `,
            [existingRes.rows[0].id, doc.infcpl || null]
          );
          comprasAtualizadas += 1;
        } else {
          await client.query(
            `
            INSERT INTO public.erp_compra_queue (
              empresa_id,
              nfe_id,
              pedido,
              origem_texto,
              status_integracao,
              mensagem_integracao,
              tentativas,
              reservado_em,
              reservado_por,
              integrado_em,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              'PENDENTE',
              'Criado automaticamente no envio ao ERP',
              0,
              NULL,
              NULL,
              NULL,
              NOW(),
              NOW()
            )
            `,
            [empresaId, id, pedido, doc.infcpl || null]
          );
          comprasCriadas += 1;
        }
      }
    } else {
      const existingNoPedidoRes = await client.query(
        `
        SELECT id
        FROM public.erp_compra_queue
        WHERE empresa_id = $1
          AND nfe_id = $2
          AND pedido IS NULL
        LIMIT 1
        `,
        [empresaId, id]
      );

      if (existingNoPedidoRes.rowCount > 0) {
        await client.query(
          `
          UPDATE public.erp_compra_queue
          SET
            origem_texto = $2,
            status_integracao = 'SEM_PEDIDO',
            mensagem_integracao = 'NF enviada ao ERP sem número de pedido identificado na observação',
            tentativas = 0,
            reservado_em = NULL,
            reservado_por = NULL,
            integrado_em = NULL,
            updated_at = NOW()
          WHERE id = $1
          `,
          [existingNoPedidoRes.rows[0].id, doc.infcpl || null]
        );
        comprasAtualizadas += 1;
      } else {
        await client.query(
          `
          INSERT INTO public.erp_compra_queue (
            empresa_id,
            nfe_id,
            pedido,
            origem_texto,
            status_integracao,
            mensagem_integracao,
            tentativas,
            reservado_em,
            reservado_por,
            integrado_em,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            NULL,
            $3,
            'SEM_PEDIDO',
            'NF enviada ao ERP sem número de pedido identificado na observação',
            0,
            NULL,
            NULL,
            NULL,
            NOW(),
            NOW()
          )
          `,
          [empresaId, id, doc.infcpl || null]
        );
        comprasCriadas += 1;
      }
    }

    await client
      .query(
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
          'REENVIO_FILA',
          $3,
          $4,
          NOW()
        )
        `,
        [
          empresaId,
          id,
          "NF enviada para fila do ERP",
          JSON.stringify({
            empresa_id: empresaId,
            chave_nfe: doc.chave_nfe,
            n_nf: doc.n_nf,
            serie: doc.serie,
            status_anterior: statusAtual,
            pedidos_encontrados: pedidos,
            compra_status: pedidos.length > 0 ? "PENDENTE" : "SEM_PEDIDO",
          }),
        ]
      )
      .catch(() => null);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "NF enviada para fila do ERP com sucesso.",
      empresa_id: empresaId,
      nfe_id: id,
      chave_nfe: doc.chave_nfe,
      n_nf: doc.n_nf,
      serie: doc.serie,
      status_erp: 1,
      fila_status: queueRes.rows?.[0]?.status || "PENDENTE",
      queue_updated: queueRes.rowCount > 0,
      pedidos_encontrados: pedidos,
      compras_criadas: comprasCriadas,
      compras_atualizadas: comprasAtualizadas,
      compra_status: pedidos.length > 0 ? "PENDENTE" : "SEM_PEDIDO",
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