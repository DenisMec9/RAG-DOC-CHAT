import path from "path";
import { readTxt } from "./readTxt.js";
import { readPdf } from "./readPdf.js";
import { createEmbedding } from "../embeddings/createEmbedding.js";
import { addToStore } from "../vectorstore/store.js";

export type DocumentMetadata = {
  source: string;
  chunkIndex: number;
};

const DEFAULT_CHUNK_SIZE = 700;
const DEFAULT_CHUNK_OVERLAP = 100;
const DEFAULT_CHUNK_TOKENS = 600;
const DEFAULT_CHUNK_OVERLAP_TOKENS = 80;

function tokenize(text: string): string[] {
  // Simple tokenizer: splits words and keeps punctuation as separate tokens.
  return text.match(/[A-Za-zÀ-ÿ0-9]+|[^\sA-Za-zÀ-ÿ0-9]/g) ?? [];
}

function tokensToText(tokens: string[]): string {
  let out = "";
  for (const token of tokens) {
    const isPunct = /[^\sA-Za-zÀ-ÿ0-9]/.test(token);
    if (!out) {
      out = token;
      continue;
    }
    if (isPunct) {
      out += token;
    } else {
      out += ` ${token}`;
    }
  }
  return out.trim();
}

function chunkTokens(tokens: string[], chunkTokens: number, overlapTokens: number): string[] {
  const chunks: string[] = [];
  if (tokens.length === 0) return chunks;

  let start = 0;
  while (start < tokens.length) {
    const end = Math.min(start + chunkTokens, tokens.length);
    const slice = tokens.slice(start, end);
    const chunk = tokensToText(slice).trim();
    if (chunk) chunks.push(chunk);
    if (end === tokens.length) break;
    start = Math.max(end - overlapTokens, 0);
  }

  return chunks;
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  if (!text) return chunks;

  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end === text.length) break;
    start = Math.max(end - overlap, 0);
  }

  return chunks;
}

type DocumentInput = {
  path: string;
  originalName?: string;
};

async function readByExtension(filePath: string, originalName?: string): Promise<string> {
  const ext = path.extname(originalName ?? filePath).toLowerCase();
  if (ext === ".txt") return readTxt(filePath);
  if (ext === ".pdf") return readPdf(filePath);
  throw new Error(`Unsupported file type: ${ext}`);
}

export async function indexDocuments(files: DocumentInput[]): Promise<void> {
  const chunkSize = Number(process.env.CHUNK_SIZE ?? DEFAULT_CHUNK_SIZE);
  const overlap = Number(process.env.CHUNK_OVERLAP ?? DEFAULT_CHUNK_OVERLAP);
  const chunkTokensSize = Number(process.env.CHUNK_TOKENS ?? DEFAULT_CHUNK_TOKENS);
  const overlapTokens = Number(process.env.CHUNK_OVERLAP_TOKENS ?? DEFAULT_CHUNK_OVERLAP_TOKENS);

  for (const file of files) {
    const text = await readByExtension(file.path, file.originalName);
    const tokens = tokenize(text);
    const chunks =
      tokens.length > 0
        ? chunkTokens(tokens, chunkTokensSize, overlapTokens)
        : chunkText(text, chunkSize, overlap);

    let chunkIndex = 0;
    for (const chunk of chunks) {
      const embedding = await createEmbedding(chunk);
      await addToStore({
        embedding,
        text: chunk,
        metadata: {
          source: file.originalName ?? file.path,
          chunkIndex,
        },
      });
      chunkIndex += 1;
    }
  }
}
