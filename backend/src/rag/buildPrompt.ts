import type { RetrievedChunk } from "./retrieveContext.js";

export function buildPrompt(question: string, chunks: RetrievedChunk[]): string {
  const context = chunks
    .map((chunk, index) => `Trecho ${index + 1}:\n${chunk.text}`)
    .join("\n\n");

  return [
    "Responda apenas com base no contexto abaixo.",
    "Se a informacao nao estiver presente, diga que nao foi encontrada no material fornecido.",
    "Priorize uma explicacao didatica e objetiva.",
    "",
    "Contexto:",
    context || "(Sem contexto recuperado)",
    "",
    `Pergunta: ${question}`,
  ].join("\n");
}
