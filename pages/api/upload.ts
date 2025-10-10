// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File as FormidableFile, Fields, Files } from "formidable";
import { v2 as cloudinary } from "cloudinary";

// Desabilita o bodyParser do Next para multipart/form-data
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "12mb", // opcional: limite global do endpoint
  },
};

// Cloudinary via variáveis de ambiente
// CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  // Log no build para facilitar diagnóstico
  // (não lança erro aqui para não quebrar a build em preview)
  // eslint-disable-next-line no-console
  console.warn("[upload] Cloudinary env vars ausentes.");
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  api_key: process.env.CLOUDINARY_API_KEY || "",
  api_secret: process.env.CLOUDINARY_API_SECRET || "",
});

// Helper: transforma o parse do formidable em Promise
function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files }> {
  const form = new IncomingForm({
    keepExtensions: true,
    multiples: false,
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    uploadDir: "/tmp", // Vercel permite escrita apenas em /tmp
    filename: (_name, _ext, part) => {
      // gera um nome simples e único
      const base = (part.originalFilename || "upload").replace(/\s+/g, "_");
      const ts = Date.now();
      return `${ts}-${base}`;
    },
  });

  return new Promise((resolve, reject) => {
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

  try {
    // garante credenciais do Cloudinary
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        error: "cloudinary_env_missing",
        detail: "Variáveis de ambiente do Cloudinary não configuradas.",
      });
    }

    const { files } = await parseForm(req);

    // aceita "file" ou "image" como nome do campo
    const fileAny =
      (Array.isArray(files.file) ? files.file[0] : (files.file as FormidableFile | undefined)) ||
      (Array.isArray(files.image) ? files.image[0] : (files.image as FormidableFile | undefined));

    if (!fileAny) {
      return res
        .status(400)
        .json({ error: "missing_file", detail: "Campo 'file' (ou 'image') não encontrado." });
    }

    // Em v2/v3 do formidable, o caminho temporário padrão é fileAny.filepath
    const localPath =
      // @ts-expect-error: compat de tipos entre v2/v3
      fileAny.filepath || (fileAny as any).filepath || (fileAny as any).path;

    if (!localPath) {
      return res
        .status(400)
        .json({ error: "missing_temp_path", detail: "Não foi possível ler o arquivo temporário." });
    }

    // Envia para Cloudinary
    const up = await cloudinary.uploader.upload(localPath, {
      folder: "produtos",
      // public_id: `produto_${Date.now()}`, // opcional
      // overwrite: true,
      // resource_type: "image", // detecta automaticamente
    });

    return res.status(200).json({
      url: up.secure_url,
      public_id: up.public_id,
      width: up.width,
      height: up.height,
      format: up.format,
    });
  } catch (e: any) {
    // Em falhas da Vercel/formidable, às vezes a mensagem é genérica.
    // Log ajuda na depuração:
    // eslint-disable-next-line no-console
    console.error("[/api/upload] error:", e);
    return res.status(500).json({
      error: "upload_error",
      detail: e?.message || "Falha ao processar upload.",
    });
  }
}
