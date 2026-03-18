import { Pool } from "pg";
import { create } from "xmlbuilder2";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida");
}

let pool = global._nfePgPoolXml;

if (!pool) {
  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  global._nfePgPoolXml = pool;
}

function firstValue(v) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({
      error: `Método ${req.method} não permitido`,
    });
  }

  try {
    const rawId = firstValue(req.query.id);
    const rawEmpresaId = firstValue(req.query.empresa_id);

    const id = Number.parseInt(String(rawId), 10);
    const empresaId = Number.parseInt(String(rawEmpresaId), 10);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      return res.status(400).json({ error: "empresa_id inválido" });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        empresa_id,
        chave_nfe,
        xml_raw
      FROM public.nfe_document
      WHERE id = $1
        AND empresa_id = $2
      LIMIT 1
      `,
      [id, empresaId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "NF não encontrada para esta empresa",
      });
    }

    const row = result.rows[0];
    const xmlData = row.xml_raw;

    if (xmlData == null || xmlData === "") {
      return res.status(404).json({
        error: "XML não encontrado para esta NF",
      });
    }

    let xml;

    try {
      if (typeof xmlData === "string" && xmlData.trim().startsWith("{")) {
        const json = JSON.parse(xmlData);

        xml = create(json).end({
          prettyPrint: true,
          headless: false,
        });
      } else if (typeof xmlData === "object") {
        xml = create(xmlData).end({
          prettyPrint: true,
          headless: false,
        });
      } else {
        xml = String(xmlData);
      }
    } catch (err) {
      console.error("Erro converter XML:", {
        message: err?.message,
        stack: err?.stack,
        nfeId: id,
        empresaId,
      });

      return res.status(500).json({
        error: "Falha converter XML",
        details: err?.message || String(err),
      });
    }

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="nfe-${row.chave_nfe || row.id}.xml"`
    );

    return res.status(200).send(xml);
  } catch (error) {
    console.error("Erro endpoint XML:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
    });

    return res.status(500).json({
      error: "Erro gerar XML",
      details: error?.message || String(error),
    });
  }
}