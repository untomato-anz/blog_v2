import { GoogleGenAI } from "@google/genai";
import { EMBED_DIMENSION, EMBED_MODEL } from "./config";

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const BATCH = 50;

function client() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.gemini_api_key;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

// Truncated (Matryoshka) embeddings are not unit length, so normalize them.
function normalize(v: number[]) {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export async function embedTexts(texts: string[], taskType: TaskType): Promise<number[][]> {
  const ai = client();
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await ai.models.embedContent({
      model: EMBED_MODEL,
      contents: batch,
      config: { taskType, outputDimensionality: EMBED_DIMENSION },
    });
    const embeddings = res.embeddings ?? [];
    if (embeddings.length !== batch.length) {
      throw new Error(`Embedding count mismatch: expected ${batch.length}, got ${embeddings.length}`);
    }
    for (const e of embeddings) out.push(normalize(e.values ?? []));
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embedTexts([text], "RETRIEVAL_QUERY");
  return v;
}
