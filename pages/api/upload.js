import { IncomingForm } from "formidable";
import fs from "fs/promises";
import path from "path";

export const config = {
  api: { bodyParser: false }, // necessário p/ multipart
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const form = new IncomingForm({
      multiples: false,
      keepExtensions: true,
      // não setamos uploadDir aqui; vamos mover manualmente
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Formidable error:", err);
        return res.status(500).json({ error: "Falha ao processar upload" });
      }

      // Pode vir como objeto ou array dependendo da versão
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) return res.status(400).json({ error: "Arquivo 'file' é obrigatório" });

      const mimetype = file.mimetype || file.type || "";
      if (!mimetype.startsWith("image/")) {
        return res.status(400).json({ error: "Somente imagens são aceitas neste endpoint" });
      }

      const tempPath = file.filepath || file.path; // compat com versões
      const uploadsDir = path.join(process.cwd(), "public", "uploads");
      await fs.mkdir(uploadsDir, { recursive: true });

      const ext = path.extname(file.originalFilename || file.newFilename || ".jpg");
      const safeName = (file.originalFilename || `img${Date.now()}${ext}`)
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const finalName = `${Date.now()}_${safeName}`;
      const finalPath = path.join(uploadsDir, finalName);

      // move/copia o arquivo temp para /public/uploads
      await fs.copyFile(tempPath, finalPath);

      // URL pública (Next serve /public direto)
      const publicUrl = `/uploads/${finalName}`;
      return res.status(201).json({ url: publicUrl });
    });
  } catch (e) {
    console.error("Upload handler error:", e);
    return res.status(500).json({ error: "Erro no servidor" });
  }
}
