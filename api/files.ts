import type { VercelRequest, VercelResponse } from "@vercel/node";
import { deleteBySource, loadStore } from "../backend/dist/vectorstore/store.js";
import { enforceApiToken, enforceRateLimit } from "./_security.js";
import { attachRequestLogging } from "./_observability.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  attachRequestLogging(req, res, "/api/files");

  if (!enforceApiToken(req, res)) return;

  try {
    if (req.method === "GET") {
      if (!enforceRateLimit(req, res, "files", 120, 60_000)) return;
      const items = await loadStore();
      const uniqueFiles = [...new Set(items.map((item) => item.metadata.source))];
      return res.json({ files: uniqueFiles });
    }

    if (req.method === "DELETE") {
      if (!enforceRateLimit(req, res, "files-delete", 20, 60_000)) return;
      const name = String(req.body?.name ?? req.query?.name ?? "").trim();
      if (!name) {
        return res.status(400).json({ error: "Informe o nome do arquivo" });
      }

      const deleted = await deleteBySource(name);
      return res.json({ deleted, name });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  }
}
