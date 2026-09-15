import { env } from "cloudflare:workers";

export type ResearchMode = "Paper analysis" | "Protocol builder" | "Statistical planning";

const instructions = [
  "You are Aurelia, an evidence-first healthcare research assistant.",
  "Do not give individual patient medical advice.",
  "Do not invent citations, studies, numerical results, or guidelines.",
  "Explicitly label uncertainty, assumptions, hypotheses, and expert opinion.",
  "For a paper analysis, identify missing information rather than guessing.",
  "Use structured plain text with concise headings.",
].join(" ");

export async function generateResearchDraft(mode: ResearchMode, question: string): Promise<string | null> {
  if (!env.OPENAI_API_KEY) return null;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: "Bearer " + env.OPENAI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || "gpt-5",
      store: false,
      instructions,
      input: "Workflow: " + mode + "\n\nResearcher request:\n" + question,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("Model provider request failed.");
  const data = await response.json() as { output_text?: unknown };
  return typeof data.output_text === "string" && data.output_text.trim() ? data.output_text.trim() : null;
}
