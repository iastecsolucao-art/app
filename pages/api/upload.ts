// pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File as FormidableFile } from "formidable";

// Next precisa disso para multipart
export const config = {
  api: { bodyParser: false, sizeLimit: "12mb" },
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});
