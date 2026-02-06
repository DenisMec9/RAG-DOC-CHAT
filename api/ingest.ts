import type { VercelRequest, VercelResponse } from "@vercel/node";
import { IncomingForm, File, Fields } from "formidable";
import { indexDocuments } from "../backend/dist/ingestion/indexDocuments.js";

// Disable Vercel's default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
    maxBodySize: 10485760, // 10MB in bytes (not expression)
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log("=== INGEST START ===");
  console.log("Method:", req.method);
  
  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = new IncomingForm({
      multiples: false,
      keepExtensions: true,
      maxFileSize: 10485760, // 10MB
    });

    console.log("Parsing form...");
    
    form.parse(
      req,
      async (err: Error | null, fields: Fields, files: { files?: File | File[] }) => {
        console.log("Form parse result:", err ? `Error: ${err.message}` : "Success");
        
        if (err) {
          console.error("Form parse error:", err);
          return res.status(500).json({ error: "Erro ao processar upload" });
        }

        const fileInput = files.files;

        if (!fileInput || (Array.isArray(fileInput) && fileInput.length === 0)) {
          console.log("No files in request");
          return res.status(400).json({ error: "Nenhum arquivo enviado" });
        }

        const file = Array.isArray(fileInput) ? fileInput[0] : fileInput;
        console.log("File received:", file.originalFilename || file.newFilename);

        const fileInputs = [
          {
            path: file.filepath,
            originalName: file.originalFilename || file.newFilename,
          },
        ];

        console.log("Starting indexDocuments...");
        await indexDocuments(fileInputs);
        console.log("indexDocuments completed!");

        return res.json({
          indexed: 1,
          files: [
            {
              name: file.originalFilename || file.newFilename,
              path: file.filepath,
            },
          ],
        });
      }
    );
  } catch (err) {
    console.error("Handler error:", err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  }
}

