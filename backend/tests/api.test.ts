import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { Express } from "express";

let app: Express;
let server: Server;
let baseUrl = "";
let realFetch: typeof fetch;

before(async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.VECTORSTORE_DB_PATH = path.join(
    os.tmpdir(),
    `rag-doc-chat-test-${Date.now()}.db`,
  );
  await mkdir(path.dirname(process.env.VECTORSTORE_DB_PATH), { recursive: true });

  const serverModule = await import("../src/server.js");
  app = serverModule.createApp();

  realFetch = global.fetch;
  global.fetch = async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("api.openai.com/v1/embeddings")) {
      return new Response(
        JSON.stringify({ data: [{ embedding: [0.21, 0.08, 0.67] }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (url.includes("api.openai.com/v1/chat/completions")) {
      return new Response(
        JSON.stringify({ choices: [{ message: { content: "Resposta de teste" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return realFetch(input, init);
  };

  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  global.fetch = realFetch;
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

test("ingest endpoint indexes a TXT file", { concurrency: false }, async () => {
  const form = new FormData();
  form.append("files", new Blob(["conteudo de teste para ingest"]), "material.txt");

  const response = await fetch(`${baseUrl}/ingest`, {
    method: "POST",
    body: form,
  });
  const json = (await response.json()) as { indexed?: number; files?: Array<{ name: string }> };

  assert.equal(response.status, 200);
  assert.equal(json.indexed, 1);
  assert.equal(json.files?.[0]?.name, "material.txt");
});

test("chat endpoint returns answer with sources", { concurrency: false }, async () => {
  const response = await fetch(`${baseUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: "Qual o conteudo?", topK: 3 }),
  });
  const json = (await response.json()) as {
    answer?: string;
    sources?: Array<{ source: string; chunkIndex: number; score: number; excerpt: string }>;
  };

  assert.equal(response.status, 200);
  assert.equal(json.answer, "Resposta de teste");
  assert.ok(Array.isArray(json.sources));
  assert.ok((json.sources?.length ?? 0) > 0);
  assert.equal(json.sources?.[0]?.source, "material.txt");
});

test("files endpoint lists and deletes indexed file", { concurrency: false }, async () => {
  const listResponse = await fetch(`${baseUrl}/files`);
  const listJson = (await listResponse.json()) as { files?: string[] };

  assert.equal(listResponse.status, 200);
  assert.ok(listJson.files?.includes("material.txt"));

  const deleteResponse = await fetch(`${baseUrl}/files`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "material.txt" }),
  });
  const deleteJson = (await deleteResponse.json()) as { deleted?: number };

  assert.equal(deleteResponse.status, 200);
  assert.ok((deleteJson.deleted ?? 0) > 0);

  const listAfterDelete = await fetch(`${baseUrl}/files`);
  const listAfterDeleteJson = (await listAfterDelete.json()) as { files?: string[] };
  assert.equal(listAfterDelete.status, 200);
  assert.ok(!listAfterDeleteJson.files?.includes("material.txt"));
});
