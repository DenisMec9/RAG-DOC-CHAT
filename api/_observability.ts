import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export function attachRequestLogging(
  req: VercelRequest,
  res: VercelResponse,
  route: string,
): void {
  const startedAt = Date.now();
  const requestId = String(req.headers["x-request-id"] || randomUUID());
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(
      JSON.stringify({
        level: "info",
        route,
        method: req.method,
        status: res.statusCode,
        requestId,
        durationMs,
      }),
    );
  });
}
