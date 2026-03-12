import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

if (!connectionString) {
  throw new Error("DATABASE_URL_VENDEDORES não está definida");
}

let pool = global._nfePdfPgPool;

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

  global._nfePdfPgPool = pool;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  try {
    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const idInt = Number.parseInt(String(rawId), 10);

    if (!Number.isInteger(idInt) || idInt <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const docRes = await pool.query(
      `
      SELECT
        id,
        chave_nfe,
        xml_raw
      FROM public.nfe_document
      WHERE id = $1
      LIMIT 1
      `,
      [idInt]
    );

    if (docRes.rowCount === 0) {
      return res.status(404).json({
        error: "Documento não encontrado",
      });
    }

    const doc = docRes.rows[0];

    // AQUI você gera o PDF real
    // const pdfBuffer = await gerarDanfePdf(doc.xml_raw);

    // Exemplo placeholder:
    const pdfBuffer = Buffer.from("");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="danfe-${doc.chave_nfe || idInt}.pdf"`
    );

    return res.status(200).send(pdfBuffer);
  } catch (e) {
    console.error("Erro em GET /api/nfe/[id]/danfe-pdf:", {
      message: e?.message,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      table: e?.table,
    });

    return res.status(500).json({
      error: "Erro ao gerar PDF da DANFE",
      details: e?.message || String(e),
    });
  }
}