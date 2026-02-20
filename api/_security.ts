import type { VercelRequest, VercelResponse } from "@vercel/node";

type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();

function getClientIp(req: VercelRequest): string {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string") {
    return header.split(",")[0]?.trim() || "unknown";
  }
  if (Array.isArray(header) && header.length > 0) {
    return header[0]?.split(",")[0]?.trim() || "unknown";
  }
  return req.socket.remoteAddress || "unknown";
}

function parseBearerToken(req: VercelRequest): string {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return "";
  return auth.slice("Bearer ".length).trim();
}

export function enforceApiToken(
  req: VercelRequest,
  res: VercelResponse,
): boolean {
  const requiredToken = process.env.APP_API_TOKEN;
  if (!requiredToken) return true;

  const token = parseBearerToken(req);
  if (token !== requiredToken) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export function enforceRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  keyPrefix: string,
  limit: number,
  windowMs: number,
): boolean {
  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Too many requests" });
    return false;
  }

  return true;
}
