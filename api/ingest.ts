import type { VercelRequest, VercelResponse } from "@vercel/node";
import { IncomingForm, File, Fields } from "formidable";
import { indexDocuments } from "../backend/dist/ingestion/indexDocuments.js";

// Disable Vercel's default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const form = new IncomingForm({
      multiples: false,
      keepExtensions: true,
    });

    form.parse(
      req,
      async (err: Error | null, fields: Fields, files: { files?: File | File[] }) => {
        if (err) {
          console.error("Error parsing form:", err);
          return res.status(500).json({ error: "Erro ao processar upload" });
        }

        // files.files can be an array or single file
        const fileInput = files.files;

        if (!fileInput || (Array.isArray(fileInput) && fileInput.length === 0)) {
          return res.status(400).json({ error: "Nenhum arquivo enviado" });
        }

        // Get the file object (handle both array and single file)
        const file = Array.isArray(fileInput) ? fileInput[0] : fileInput;

        // Create file input for indexDocuments
        const fileInputs = [
          {
            path: file.filepath,
            originalName: file.originalFilename || file.newFilename,
          },
        ];

        await indexDocuments(fileInputs);

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
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  }
}

