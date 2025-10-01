import { google } from "googleapis";
import { Pool } from "pg";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // desabilita bodyParser para usar formidable
  },
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function uploadToGoogleDrive(auth, file) {
  const drive = google.drive({ version: "v3", auth });

  const filePath = file.filepath;
  console.log("uploadToGoogleDrive - filePath:", filePath);
  if (!filePath) {
    throw new Error("Caminho do arquivo não encontrado");
  }

  const fileMetadata = {
    name: file.originalFilename || file.newFilename || "upload",
    parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
  };

  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(filePath),
  };

  console.log("uploadToGoogleDrive - iniciando upload para Google Drive...");
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id",
  });
  console.log("uploadToGoogleDrive - upload concluído, fileId:", response.data.id);

  return response.data.id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.error("Configuração do Google Drive ausente");
    return res.status(500).json({ error: "Configuração do Google Drive ausente" });
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  const form = formidable({ multiples: false });

  try {
    console.log("Iniciando parse do formulário...");
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("Erro no parse do form:", err);
          reject(err);
        } else {
          resolve({ fields, files });
        }
      });
    });

    console.log("Campos recebidos:", fields);
    console.log("Arquivos recebidos:", files);
    console.log("Detalhes do arquivo recebido:", JSON.stringify(files.file, null, 2));

    const { descricao, data_inicio, data_fim, empresa_id } = fields;
    const fileArray = files.file;

    if (!fileArray || !fileArray.length) {
      console.error("Arquivo não enviado");
      return res.status(400).json({ error: "Arquivo não enviado" });
    }

    const file = fileArray[0];

    if (!descricao || !data_inicio || !data_fim || !empresa_id || empresa_id === "undefined") {
      console.error("Campos obrigatórios ausentes ou inválidos:", { descricao, data_inicio, data_fim, empresa_id });
      return res.status(400).json({ error: "Campos obrigatórios ausentes ou inválidos" });
    }

    const authClient = await auth.getClient();

    // Upload para Google Drive
    const fileId = await uploadToGoogleDrive(authClient, file);

    // Salvar no banco
    const client = await pool.connect();
    try {
      const insertQuery = `
        INSERT INTO promocoes (descricao, id_arquivo_google, data_inicio, data_fim, empresa_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const result = await client.query(insertQuery, [
        descricao,
        fileId,
        data_inicio,
        data_fim,
        empresa_id,
      ]);

      console.log("Promoção salva com sucesso, id:", result.rows[0].id);
      return res.status(200).json({ message: "Promoção cadastrada com sucesso", id: result.rows[0].id });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Erro ao salvar promoção:", error);
    return res.status(500).json({ error: "Erro interno ao salvar promoção" });
  }
}