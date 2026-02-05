import { promises as fs } from "fs";

export async function readTxt(filePath: string): Promise<string> {
  const raw = await fs.readFile(filePath, "utf8");

  // Normalize line endings and collapse excessive whitespace for clean chunks.
  const normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u0000/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ ]{2,}/g, " ")
    .trim();

  return normalized;
}
