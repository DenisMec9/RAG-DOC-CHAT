import { promises as fs } from "fs";
import pdfParse from "pdf-parse";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type TextItem = { str?: string };
type TextContent = { items: TextItem[] };

export async function readPdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  let dataText = "";

  try {
    const data = await pdfParse(buffer);
    dataText = data.text ?? "";
  } catch {
    // Fallback for PDFs with broken xref tables.
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      stopAtErrors: false,
    } as any);
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = (await page.getTextContent()) as TextContent;
      const pageText = content.items.map((item) => item.str ?? "").join(" ");
      pages.push(pageText);
    }
    dataText = pages.join("\n\n");
  }

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
