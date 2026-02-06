import { promises as fs } from "fs";
import pdfParse from "pdf-parse";

type TextItem = { str?: string };
type TextContent = { items: TextItem[] };

export async function readPdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);

  const data = await pdfParse(buffer);
  let dataText = data.text ?? "";

  // Normalize text: line endings, whitespace, etc.
  const normalized = dataText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ ]{2,}/g, " ")
    .trim();

  return normalized;
}

