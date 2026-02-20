import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  const requestId = String(req.headers["x-request-id"] || randomUUID());
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        level: "info",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        requestId,
        durationMs,
      }),
    );
  });

  next();
}
