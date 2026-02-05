import { promises as fs } from "fs";
import path from "path";

export type StoredVector = {
  embedding: number[];
  text: string;
  metadata: {
    source: string;
    chunkIndex: number;
  };
};

const isVercel = Boolean(process.env.VERCEL);
const runtimeDir = isVercel ? "/tmp" : process.cwd();
const DEFAULT_STORE_PATH = path.join(runtimeDir, "data", "vectorstore.json");

async function ensureStoreFile(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify({ items: [] }, null, 2), "utf8");
  }
}

export async function loadStore(): Promise<StoredVector[]> {
  const storePath = process.env.VECTORSTORE_PATH ?? DEFAULT_STORE_PATH;
  await ensureStoreFile(storePath);
  const raw = await fs.readFile(storePath, "utf8");
  const parsed = JSON.parse(raw) as { items: StoredVector[] };
  return parsed.items ?? [];
}

export async function saveStore(items: StoredVector[]): Promise<void> {
  const storePath = process.env.VECTORSTORE_PATH ?? DEFAULT_STORE_PATH;
  await ensureStoreFile(storePath);
  await fs.writeFile(storePath, JSON.stringify({ items }, null, 2), "utf8");
}

export async function addToStore(item: StoredVector): Promise<void> {
  const items = await loadStore();
  items.push(item);
  await saveStore(items);
}
