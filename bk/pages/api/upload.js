import fs from "fs";
import { Pool } from "pg";
import { parse } from "csv-parse/sync";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false, // importante para usar formidable
  },
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Método ${req.method} não permitido`);
  }

  const form = formidable({ multiples: false, keepExtensions: true });

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    let tipo = fields.tipo;
    if (Array.isArray(tipo)) {
      tipo = tipo[0];
    }

    console.log("Tipo recebido:", tipo);

    let file = files.file;
    if (Array.isArray(file)) {
      file = file[0];
    }

    if (!file) {
      return res.status(400).json({ error: "Arquivo não enviado" });
    }

    const filePath = file.filepath || file.filePath;
    if (!filePath) {
      return res.status(400).json({ error: "Caminho do arquivo não encontrado" });
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
    });

    const client = await pool.connect();

    if (tipo === "produtos") {
      for (const row of records) {
        await client.query(
          `INSERT INTO produto (descricao, codigo_barra, empresa_id) 
           VALUES ($1, $2, (SELECT id FROM empresa WHERE nome = $3 LIMIT 1))
           ON CONFLICT (codigo_barra) DO UPDATE SET descricao = EXCLUDED.descricao`,
          [row.descricao, row.codbarra, row.empresa]
        );
      }
    } else if (tipo === "tabela_apoio") {
      for (const row of records) {
        await client.query(
          `INSERT INTO contagem_apoio (setor, operador, loja) 
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [row.setor, row.operador, row.loja]
        );
      }
    } else {
      client.release();
      return res.status(400).json({ error: "Tipo inválido" });
    }

    client.release();
    return res.status(200).json({ message: "Upload processado com sucesso" });
  } catch (error) {
    console.error("Erro ao processar upload:", error);
    return res.status(500).json({ error: "Erro ao processar arquivo" });
  }
}