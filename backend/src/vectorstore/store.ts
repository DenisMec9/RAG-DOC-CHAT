import sqlite3 from "sqlite3";
import path from "path";

export type StoredVector = {
  embedding: number[];
  text: string;
  metadata: {
    source: string;
    chunkIndex: number;
  };
};

// No Vercel, use /tmp. Otherwise use current directory
const isVercel = process.env.VERCEL === "1";
const runtimeDir = isVercel ? "/tmp" : process.cwd();
const DEFAULT_DB_PATH = process.env.VECTORSTORE_DB_PATH ?? path.join(runtimeDir, "vectorstore.db");
const allowEphemeralStore = process.env.ALLOW_EPHEMERAL_STORE === "1";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseTable = process.env.SUPABASE_VECTOR_TABLE ?? "vectors";

let db: sqlite3.Database;

function shouldUseSupabase(): boolean {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function assertVercelPersistencePolicy(): void {
  if (isVercel && !shouldUseSupabase() && !allowEphemeralStore) {
    throw new Error(
      "Persistencia nao configurada no Vercel. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY, ou ALLOW_EPHEMERAL_STORE=1 para desenvolvimento.",
    );
  }
}

async function supabaseRequest(
  method: "GET" | "POST" | "DELETE",
  query = "",
  body?: unknown,
): Promise<Response> {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY nao configuradas");
  }

  const url = `${supabaseUrl}/rest/v1/${supabaseTable}${query}`;
  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      Prefer: "return=representation",
    },
  };
  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }
  return fetch(url, requestInit);
}

function normalizeStoredRow(row: {
  embedding: unknown;
  text: unknown;
  metadata: unknown;
}): StoredVector {
  return {
    embedding: Array.isArray(row.embedding)
      ? (row.embedding as number[])
      : JSON.parse(String(row.embedding ?? "[]")),
    text: String(row.text ?? ""),
    metadata:
      typeof row.metadata === "object" && row.metadata !== null
        ? (row.metadata as StoredVector["metadata"])
        : JSON.parse(String(row.metadata ?? "{}")),
  };
}

async function getDb(): Promise<sqlite3.Database> {
  assertVercelPersistencePolicy();
  if (shouldUseSupabase()) {
    throw new Error("SQLite desabilitado: usando Supabase para persistencia");
  }

  if (!db) {
    db = new sqlite3.Database(DEFAULT_DB_PATH);
    await new Promise<void>((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS vectors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          embedding TEXT NOT NULL,
          text TEXT NOT NULL,
          metadata TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error("Error creating table:", err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  return db;
}

export async function loadStore(): Promise<StoredVector[]> {
  assertVercelPersistencePolicy();
  if (shouldUseSupabase()) {
    const response = await supabaseRequest("GET", "?select=embedding,text,metadata");
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro ao carregar store no Supabase: ${response.status} ${errText}`);
    }
    const rows = (await response.json()) as Array<{
      embedding: unknown;
      text: unknown;
      metadata: unknown;
    }>;
    return rows.map(normalizeStoredRow);
  }

  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDb();
      db.all("SELECT embedding, text, metadata FROM vectors", [], (err, rows) => {
        if (err) {
          console.error("Error loading store:", err);
          return reject(err);
        }
        const items: StoredVector[] = rows.map((row: any) => ({
          embedding: JSON.parse(row.embedding),
          text: row.text,
          metadata: JSON.parse(row.metadata),
        }));
        resolve(items);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export async function saveStore(items: StoredVector[]): Promise<void> {
  assertVercelPersistencePolicy();
  if (shouldUseSupabase()) {
    const removeResponse = await supabaseRequest("DELETE", "?id=gt.0");
    if (!removeResponse.ok) {
      const errText = await removeResponse.text();
      throw new Error(`Erro ao limpar store no Supabase: ${removeResponse.status} ${errText}`);
    }

    if (items.length === 0) return;

    const insertRows = items.map((item) => ({
      embedding: item.embedding,
      text: item.text,
      metadata: item.metadata,
    }));
    const insertResponse = await supabaseRequest("POST", "", insertRows);
    if (!insertResponse.ok) {
      const errText = await insertResponse.text();
      throw new Error(`Erro ao salvar store no Supabase: ${insertResponse.status} ${errText}`);
    }
    return;
  }

  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDb();
      db.serialize(() => {
        db.run("DELETE FROM vectors", (err: any) => {
          if (err) return reject(err);
          const stmt = db.prepare("INSERT INTO vectors (embedding, text, metadata) VALUES (?, ?, ?)");
          items.forEach((item) => {
            stmt.run(JSON.stringify(item.embedding), item.text, JSON.stringify(item.metadata));
          });
          stmt.finalize((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
    } catch (err) {
      reject(err);
    }
  });
}

export async function addToStore(item: StoredVector): Promise<void> {
  assertVercelPersistencePolicy();
  if (shouldUseSupabase()) {
    const response = await supabaseRequest("POST", "", [
      {
        embedding: item.embedding,
        text: item.text,
        metadata: item.metadata,
      },
    ]);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro ao inserir no Supabase: ${response.status} ${errText}`);
    }
    return;
  }

  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDb();
      db.run(
        "INSERT INTO vectors (embedding, text, metadata) VALUES (?, ?, ?)",
        [JSON.stringify(item.embedding), item.text, JSON.stringify(item.metadata)],
        function (err: any) {
          if (err) reject(err);
          else resolve();
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}

export async function clearStore(): Promise<void> {
  await saveStore([]);
}

export async function deleteBySource(source: string): Promise<number> {
  const normalized = source.trim();
  if (!normalized) return 0;

  assertVercelPersistencePolicy();
  if (shouldUseSupabase()) {
    const filter = encodeURIComponent(normalized);
    const response = await supabaseRequest(
      "DELETE",
      `?metadata->>source=eq.${filter}`,
    );
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro ao remover fonte no Supabase: ${response.status} ${errText}`);
    }
    const rows = (await response.json()) as unknown[];
    return Array.isArray(rows) ? rows.length : 0;
  }

  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDb();
      db.run(
        "DELETE FROM vectors WHERE json_extract(metadata, '$.source') = ?",
        [normalized],
        function (err: Error | null) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes ?? 0);
        },
      );
    } catch (err) {
      reject(err);
    }
  });
}

