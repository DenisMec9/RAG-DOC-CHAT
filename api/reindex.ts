import type { VercelRequest, VercelResponse } from "@vercel/node";
import { IncomingForm, File, Fields } from "formidable";
import fs from "fs/promises";
import path from "path";
import { clearStore } from "../backend/dist/vectorstore/store.js";
import { indexDocuments } from "../backend/dist/ingestion/indexDocuments.js";
import { enforceApiToken, enforceRateLimit } from "./_security.js";
import { attachRequestLogging } from "./_observability.js";
import { sendHttpError } from "./_errors.js";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const config = {
  api: {
    bodyParser: false,
    maxBodySize: MAX_UPLOAD_BYTES,
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  attachRequestLogging(req, res, "/api/reindex");

  let tempFiles: File[] = [];
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!enforceApiToken(req, res)) return;
  if (!enforceRateLimit(req, res, "reindex", 5, 60_000)) return;

  try {
    const form = new IncomingForm({
      multiples: true,
      keepExtensions: true,
      maxFileSize: MAX_UPLOAD_BYTES,
      maxTotalFileSize: MAX_UPLOAD_BYTES,
      maxFiles: 4,
    });

    const parsed = await new Promise<{ fields: Fields; files: { files?: File | File[] } }>(
      (resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          return resolve({ fields, files: files as { files?: File | File[] } });
        });
      },
    );

    const fileInput = parsed.files.files;
    const files = !fileInput ? [] : Array.isArray(fileInput) ? fileInput : [fileInput];
    tempFiles = files;
    if (files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const hasInvalidFormat = files.some((file) => {
      const ext = path.extname(file.originalFilename || file.newFilename || "").toLowerCase();
      return ext !== ".pdf" && ext !== ".txt";
    });
    if (hasInvalidFormat) {
      return res.status(400).json({ error: "Formato nao suportado. Envie apenas PDF ou TXT." });
    }

    await clearStore();
    await indexDocuments(
      files.map((file) => ({
        path: file.filepath,
        originalName: file.originalFilename || file.newFilename,
      })),
    );

    return res.json({
      indexed: files.length,
      mode: "reindex",
      files: files.map((file) => ({
        name: file.originalFilename || file.newFilename,
      })),
    });
  } catch (err) {
    return sendHttpError(res, err);
  } finally {
    await Promise.all(
      tempFiles.map(async (file) => {
        try {
          await fs.unlink(file.filepath);
        } catch {
          // noop
        }
      }),
    );
  }
}
