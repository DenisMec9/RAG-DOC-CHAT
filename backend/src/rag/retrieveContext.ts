import { createEmbedding } from "../embeddings/createEmbedding.js";
import { loadStore } from "../vectorstore/store.js";
import { cosineSimilarity } from "../vectorstore/similarity.js";

export type RetrievedChunk = {
  text: string;
  metadata: {
    source: string;
    chunkIndex: number;
  };
  score: number;
};

export async function retrieveContext(
  question: string,
  topK = 5,
  sourceFilter?: string,
): Promise<RetrievedChunk[]> {
  const items = await loadStore();
  if (items.length === 0) return [];

  const normalizedFilter = sourceFilter?.trim();
  const filteredItems =
    normalizedFilter && normalizedFilter.length > 0
      ? items.filter((item) => item.metadata.source === normalizedFilter)
      : items;

  if (filteredItems.length === 0) return [];

  const queryEmbedding = await createEmbedding(question);

  const scored = filteredItems.map((item) => ({
    text: item.text,
    metadata: item.metadata,
    score: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((item) => item.score > 0);
}
