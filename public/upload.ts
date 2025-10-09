import { IncomingForm } from "formidable";
import fs from "fs";
import path from "path";
import { promisify } from "util";

export const config = {
  api: { bodyParser: false }, // obrigatório p/ multipart
};

const mkdir = promisify(fs.mkdir);
const rename = promisify(fs.rename);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  try {
    if (!fs.existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const form = new IncomingForm({ multiples: false, keepExtensions: true, uploadDir });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Falha ao processar upload" });
      }

      const file: any = files.file;
      if (!file) return res.status(400).json({ error: "Arquivo não enviado" });

      const ext = path.extname(file.originalFilename || file.newFilename || ".jpg");
      const finalName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
      const finalPath = path.join(uploadDir, finalName);
      await rename(file.filepath || file.path, finalPath);

      // URL pública
      const publicUrl = `/uploads/${finalName}`;
      return res.status(201).json({ url: publicUrl });
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro no upload" });
  }
}
