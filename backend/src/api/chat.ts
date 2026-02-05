import { Router } from "express";
import { retrieveContext } from "../rag/retrieveContext.js";
import { buildPrompt } from "../rag/buildPrompt.js";


const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const question = String(req.body?.question ?? "").trim();
    if (!question) {
      return res.status(400).json({ error: "Pergunta obrigatoria" });
    }

    const topK = Number(req.body?.topK ?? 5);
    const fileName = req.body?.fileName ? String(req.body.fileName) : undefined;
    const chunks = await retrieveContext(question, topK, fileName);

    if (chunks.length === 0) {
      return res.json({
        answer: "Nao encontrei essa informacao no material fornecido.",
      });
    }

    const prompt = buildPrompt(question, chunks);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

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
      throw new Error(`OpenAI chat error: ${response.status} ${errText}`);
    }

    const json = (await response.json()) as {
      choices: Array<{ message?: { content?: string } }>;
    };

    const answer = json.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return res.status(502).json({ error: "Resposta invalida do modelo" });
    }

    return res.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return res.status(500).json({ error: message });
  }
});

export default router;
