import { Pool } from "pg";
import { create } from "xmlbuilder2";

const connectionString = process.env.DATABASE_URL_VENDEDORES;

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

export default async function handler(req, res) {
  try {
    const id = parseInt(req.query.id);

    const result = await pool.query(
      `
      SELECT
        chave_nfe,
        xml_raw
      FROM nfe_document
      WHERE id = $1
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "NF não encontrada" });
    }

    const row = result.rows[0];

    let xmlData = row.xml_raw;

    console.log("Tipo xml_raw:", typeof xmlData);
    console.log("Primeiros 200 chars:", String(xmlData).slice(0, 200));

    let xml;

    try {
      if (typeof xmlData === "string" && xmlData.trim().startsWith("{")) {
        console.log("Convertendo JSON → XML");

        const json = JSON.parse(xmlData);

        xml = create(json).end({
          prettyPrint: true,
          headless: false
        });

      } else if (typeof xmlData === "object") {
        console.log("Convertendo OBJ → XML");

        xml = create(xmlData).end({
          prettyPrint: true,
          headless: false
        });

      } else {
        console.log("XML já está em formato texto");

        xml = xmlData;
      }

    } catch (err) {
      console.error("Erro converter XML:", err);

      return res.status(500).json({
        error: "Falha converter XML",
        details: err.message
      });
    }

    console.log("XML final gerado:");
    console.log(xml.slice(0, 200));

    res.setHeader("Content-Type", "application/xml");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="nfe-${row.chave_nfe}.xml"`
    );

    res.send(xml);

  } catch (error) {

    console.error("Erro endpoint XML:", error);

    res.status(500).json({
      error: "Erro gerar XML",
      details: error.message
    });
  }
}