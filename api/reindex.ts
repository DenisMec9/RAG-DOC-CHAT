import type { VercelRequest, VercelResponse } from "@vercel/node";
import { IncomingForm, File, Fields } from "formidable";
import fs from "fs/promises";
import path from "path";
import { clearStore } from "../backend/dist/vectorstore/store.js";
import { indexDocuments } from "../backend/dist/ingestion/indexDocuments.js";
import { enforceApiToken, enforceRateLimit } from "./_security.js";
import { attachRequestLogging } from "./_observability.js";

export const config = {
  api: {
    bodyParser: false,
    maxBodySize: 10485760,
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
      maxFileSize: 10485760,
      maxTotalFileSize: 10485760 * 4,
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
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
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
