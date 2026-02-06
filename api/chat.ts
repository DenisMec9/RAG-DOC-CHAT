import type { VercelRequest, VercelResponse } from "@vercel/node";
import { retrieveContext } from "../backend/dist/rag/retrieveContext.js";
import { buildPrompt } from "../backend/dist/rag/buildPrompt.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { question } = req.body;

  if (!question || typeof question !== "string" || question.trim() === "") {
    return res.status(400).json({ error: "Pergunta obrigatória" });
  }

  const topK = Number(req.body?.topK ?? 5);
  const fileName = req.body?.fileName ? String(req.body.fileName) : undefined;

  try {
    const chunks = await retrieveContext(question, topK, fileName);

    if (chunks.length === 0) {
      return res.json({
        answer: "Não encontrei essa informação no material fornecido.",
      });
    }

    const prompt = buildPrompt(question, chunks);
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY não configurada");
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
            content:
              "Você é um tutor técnico. Não invente nada fora do contexto.",
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
      return res.status(502).json({ error: "Resposta inválida do modelo" });
    }

    return res.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  }
}

