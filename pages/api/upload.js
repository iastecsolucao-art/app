// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File as FormidableFile } from "formidable";
import { v2 as cloudinary } from "cloudinary";

// ⛔ Desabilita o bodyParser para aceitar multipart
export const config = {
  api: {
    bodyParser: false,
  },
};

// Configure via variáveis de ambiente
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      multiples: false,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(400).json({ error: "parse_error", detail: err.message });
      }

      const file = files.file as FormidableFile | undefined;
      if (!file?.filepath) {
        return res.status(400).json({ error: "missing_file", detail: "Campo 'file' não encontrado" });
      }

      // Faz upload para o Cloudinary
      const up = await cloudinary.uploader.upload(file.filepath, {
        folder: "produtos",
        // opcional: public_id: `produto_${Date.now()}`
      });

      return res.status(200).json({
        url: up.secure_url,
        public_id: up.public_id,
        width: up.width,
        height: up.height,
        format: up.format,
      });
    });
  } catch (e: any) {
    return res.status(500).json({ error: "upload_error", detail: e?.message });
  }
}
