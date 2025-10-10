// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File as FormidableFile } from "formidable";

// Desabilita o bodyParser do Next para multipart/form-data
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "12mb",
  },
};

// Import “à prova de bala” (evita problemas ESM/CJS)
const { v2: cloudinary } = require("cloudinary");

// Config Cloudinary pelas envs
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function parseForm(
  req: NextApiRequest,
): Promise<{ fields: Record<string, any>; files: Record<string, FormidableFile | FormidableFile[]> }> {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      multiples: false,
    });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // Falha cedo se faltar env
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return res.status(500).json({
      error: "missing_env",
      detail: "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET são obrigatórias.",
    });
  }

  try {
    const { files } = await parseForm(req);

    let file = files.file as FormidableFile | FormidableFile[] | undefined;
    if (Array.isArray(file)) file = file[0];

    if (!file) {
      return res.status(400).json({
        error: "missing_file",
        detail: "Envie o arquivo no campo 'file' do FormData.",
      });
    }

    // Compatibilidade: algumas versões expõem .filepath, outras .path
    const tmpPath = (file as any).filepath ?? (file as any).path;
    if (!tmpPath) {
      return res.status(400).json({
        error: "bad_file",
        detail: "Não foi possível obter o caminho temporário do arquivo.",
      });
    }

    // Upload no Cloudinary
    const up = await cloudinary.uploader.upload(tmpPath, {
      folder: "produtos",
      resource_type: "image",
    });

    return res.status(200).json({
      url: up.secure_url,
      public_id: up.public_id,
      width: up.width,
      height: up.height,
      format: up.format,
    });
  } catch (err: any) {
    console.error("[upload] error:", err);
    return res.status(500).json({
      error: "upload_error",
      detail: err?.message || "Erro inesperado ao fazer upload.",
    });
  }
}
