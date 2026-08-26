// Thin client for the local Ollama instance running on the ingestion laptop.
// Enrichment is optional infrastructure: if Ollama isn't running, callers
// get `null` back and the pipeline keeps going with what it already has —
// it never blocks or fails a run just because enrichment was unavailable.
const BASE_URL = process.env.LLM_BASE_URL ?? "http://localhost:11434";
const MODEL = process.env.LLM_MODEL ?? "llama3.2:1b";

export type Enrichment = {
  description: string;
  sector?: string;
  stage?: "idea" | "early" | "growth" | "established" | "unknown";
};

export async function enrichDescription(input: {
  name: string;
  tagline?: string;
}): Promise<Enrichment | null> {
  const prompt = [
    "You label startups for a public directory. Use only the facts given — never invent funding,",
    "team size, or achievements. If you don't know something, say 'unknown'.",
    "",
    `Name: ${input.name}`,
    `Tagline: ${input.tagline ?? "unknown"}`,
    "",
    'Return strict JSON: {"description": "<= 200 chars, factual", "sector": "1-2 words", "stage": "idea|early|growth|established|unknown"}',
  ].join("\n");

  try {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, stream: false, format: "json" }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);

    const data = (await res.json()) as { response: string };
    return JSON.parse(data.response) as Enrichment;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[llm] enrichment skipped for "${input.name}": ${message}`);
    return null;
  }
}
