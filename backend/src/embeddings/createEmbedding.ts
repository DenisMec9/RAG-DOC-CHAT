export type EmbeddingResponse = {
  embedding: number[];
};

export async function createEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: text,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI embeddings error: ${response.status} ${errText}`);
  }

  const json = (await response.json()) as { data: Array<{ embedding: number[] }> };
  if (!json.data?.[0]?.embedding) {
    throw new Error("OpenAI embeddings response malformed");
  }

  return json.data[0].embedding;
}
