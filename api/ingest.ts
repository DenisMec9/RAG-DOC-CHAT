import type { VercelRequest, VercelResponse } from "@vercel/node";
import { indexDocuments } from "../backend/dist/ingestion/indexDocuments.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // No Vercel, os arquivos são enviados como JSON codificado em base64
    // porque não há suporte a multipart/form-data em Serverless
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    // Os arquivos devem ser passados como array de objetos com path e originalName
    // Exemplo: { path: "/tmp/...", originalName: "documento.pdf" }
    const fileInputs = files.map((file: any) => ({
      path: file.path,
      originalName: file.originalName,
    }));

    await indexDocuments(fileInputs);

    return res.json({
      indexed: files.length,
      files: files.map((file: any) => ({
        name: file.originalName,
        path: file.path,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  }
}

