import type { VercelRequest, VercelResponse } from "@vercel/node";
import { retrieveContext } from "../backend/dist/rag/retrieveContext.js";
import { buildPrompt } from "../backend/dist/rag/buildPrompt.js";
import { enforceApiToken, enforceRateLimit } from "./_security.js";
import { attachRequestLogging } from "./_observability.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  attachRequestLogging(req, res, "/api/chat");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!enforceApiToken(req, res)) return;
  if (!enforceRateLimit(req, res, "chat", 30, 60_000)) return;

  const { question } = req.body;

  if (!question || typeof question !== "string" || question.trim() === "") {
    return res.status(400).json({ error: "Pergunta obrigatoria" });
  }

  const topK = Math.min(12, Math.max(1, Number(req.body?.topK ?? 5)));
  const fileName = req.body?.fileName ? String(req.body.fileName) : undefined;

  try {
    const chunks = await retrieveContext(question, topK, fileName);
    const sources = chunks.slice(0, 5).map((chunk) => ({
      source: chunk.metadata.source,
      chunkIndex: chunk.metadata.chunkIndex,
      score: Number(chunk.score.toFixed(4)),
      excerpt: chunk.text.slice(0, 180),
    }));

    if (chunks.length === 0) {
      return res.json({
        answer: "Nao encontrei essa informacao no material fornecido.",
        sources: [],
      });
    }

    const prompt = buildPrompt(question, chunks);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY nao configurada");
    }

    const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: "Voce e um tutor tecnico. Nao invente nada fora do contexto.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro OpenAI: ${response.status} ${errText}`);
    }

    const json = (await response.json()) as {
      choices: Array<{ message?: { content?: string } }>;
    };

    const answer = json.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return res.status(502).json({ error: "Resposta invalida do modelo" });
    }

    return res.json({ answer, sources });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  }
}
