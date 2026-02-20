import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { indexDocuments } from "../ingestion/indexDocuments.js";
import { clearStore, deleteBySource, loadStore } from "../vectorstore/store.js";
import { enforceApiToken, enforceRateLimit } from "../security/policies.js";

const router = Router();

const isVercel = Boolean(process.env.VERCEL);
const runtimeDir = isVercel ? "/tmp" : process.cwd();
const uploadDir = process.env.UPLOAD_DIR ?? path.join(runtimeDir, "data", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: {
    files: 4,
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf" && ext !== ".txt") {
      cb(new Error("Formato nao suportado. Envie apenas PDF ou TXT."));
      return;
    }
    cb(null, true);
  },
});

async function cleanupTempFiles(files: Express.Multer.File[]): Promise<void> {
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

async function runIndex(files: Express.Multer.File[], replaceStore: boolean): Promise<void> {
  if (replaceStore) {
    await clearStore();
  }

  const fileInputs = files.map((file) => ({
    path: file.path,
    originalName: file.originalname,
  }));
  await indexDocuments(fileInputs);
}

router.post("/ingest", upload.array("files"), async (req, res) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  try {
    if (!enforceApiToken(req, res)) return;
    if (!enforceRateLimit(req, res, "ingest", 10, 60_000)) return;

    if (files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    await runIndex(files, false);

    return res.json({
      indexed: files.length,
      files: files.map((file) => ({ name: file.originalname })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  } finally {
    await cleanupTempFiles(files);
  }
});

router.post("/reindex", upload.array("files"), async (req, res) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  try {
    if (!enforceApiToken(req, res)) return;
    if (!enforceRateLimit(req, res, "reindex", 5, 60_000)) return;

    if (files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    await runIndex(files, true);

    return res.json({
      indexed: files.length,
      mode: "reindex",
      files: files.map((file) => ({ name: file.originalname })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  } finally {
    await cleanupTempFiles(files);
  }
});

router.get("/files", async (req, res) => {
  try {
    if (!enforceApiToken(req, res)) return;
    if (!enforceRateLimit(req, res, "files", 120, 60_000)) return;

    const items = await loadStore();
    const uniqueFiles = [...new Set(items.map((item) => item.metadata.source))];
    return res.json({ files: uniqueFiles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  }
});

router.delete("/files", async (req, res) => {
  try {
    if (!enforceApiToken(req, res)) return;
    if (!enforceRateLimit(req, res, "files-delete", 20, 60_000)) return;

    const name = String(req.body?.name ?? req.query?.name ?? "").trim();
    if (!name) {
      return res.status(400).json({ error: "Informe o nome do arquivo" });
    }

    const deleted = await deleteBySource(name);
    return res.json({ deleted, name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  }
});

export default router;