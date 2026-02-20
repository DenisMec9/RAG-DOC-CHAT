import type { VercelResponse } from "@vercel/node";

const PERSISTENCE_CONFIG_SNIPPET = "Persistencia nao configurada no Vercel";

export function getHttpError(err: unknown): { status: number; message: string } {
  const message = err instanceof Error ? err.message : "Erro interno";

  if (message.includes(PERSISTENCE_CONFIG_SNIPPET)) {
    return { status: 503, message };
  }

  if (
    message.includes("maxFileSize") ||
    message.includes("maxTotalFileSize") ||
    message.includes("Request Entity Too Large")
  ) {
    return {
      status: 413,
      message: "Arquivo muito grande para upload na Vercel. Limite aproximado: 4MB por request.",
    };
  }

  return { status: 500, message };
}

export function sendHttpError(res: VercelResponse, err: unknown): void {
  const { status, message } = getHttpError(err);
  res.status(status).json({ error: message });
}
