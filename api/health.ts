import type { VercelRequest, VercelResponse } from "@vercel/node";
import { attachRequestLogging } from "./_observability.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  attachRequestLogging(req, res, "/api/health");
  return res.json({ ok: true });
}

