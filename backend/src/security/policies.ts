import type { Request, Response } from "express";

type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0]?.trim() || req.ip || "unknown";
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]?.split(",")[0]?.trim() || req.ip || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function parseBearerToken(req: Request): string {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return "";
  return auth.slice("Bearer ".length).trim();
}

export function enforceApiToken(req: Request, res: Response): boolean {
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
  req: Request,
  res: Response,
  keyPrefix: string,
  limit: number,
  windowMs: number,
): boolean {
  const key = `${keyPrefix}:${getClientIp(req)}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ error: "Too many requests" });
    return false;
  }

  return true;
}
