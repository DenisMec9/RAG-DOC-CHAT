import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { indexDocuments } from "../ingestion/indexDocuments.js";

const router = Router();

const isVercel = Boolean(process.env.VERCEL);
const runtimeDir = isVercel ? "/tmp" : process.cwd();
const uploadDir = process.env.UPLOAD_DIR ?? path.join(runtimeDir, "data", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir });

router.post("/ingest", upload.array("files"), async (req, res) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  try {
    if (files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const fileInputs = files.map((file) => ({
      path: file.path,
      originalName: file.originalname,
    }));
    await indexDocuments(fileInputs);

    return res.json({
      indexed: files.length,
      files: files.map((file) => ({ name: file.originalname, path: file.path })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  } finally {
    // Clean up temp files after indexing.
    await Promise.all(
      files.map(async (file) => {
        try {
          await fs.promises.unlink(file.path);
        } catch {
          // Ignore cleanup errors.
        }
      }),
    );
  }
});

export default router;
