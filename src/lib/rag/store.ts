import { Pinecone } from "@pinecone-database/pinecone";
import { EMBED_DIMENSION, MIN_SCORE, RAG_INDEX_NAME, RAG_NAMESPACE, TOP_K } from "./config";

export type ChunkMetadata = { source: string; page: number; text: string };

export type RetrievedChunk = ChunkMetadata & { score: number };

function pinecone() {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error("PINECONE_API_KEY is not set");
  return new Pinecone({ apiKey });
}

/** Creates the serverless index if it does not exist yet (used by the ingest script). */
export async function ensureIndex() {
  const pc = pinecone();
  const { indexes } = await pc.listIndexes();
  if (indexes?.some((i) => i.name === RAG_INDEX_NAME)) return;

  await pc.createIndex({
    name: RAG_INDEX_NAME,
    dimension: EMBED_DIMENSION,
    metric: "cosine",
    spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    waitUntilReady: true,
  });
}

function namespace() {
  return pinecone().index<ChunkMetadata>(RAG_INDEX_NAME).namespace(RAG_NAMESPACE);
}

export async function upsertChunks(
  records: { id: string; values: number[]; metadata: ChunkMetadata }[],
) {
  const ns = namespace();
  for (let i = 0; i < records.length; i += 100) {
    await ns.upsert({ records: records.slice(i, i + 100) });
  }
}

export async function clearNamespace() {
  try {
    await namespace().deleteAll();
  } catch {
    // A namespace that was never written to does not exist yet.
  }
}

export async function searchChunks(vector: number[]): Promise<RetrievedChunk[]> {
  const res = await namespace().query({
    vector,
    topK: TOP_K,
    includeMetadata: true,
  });

  return (res.matches ?? [])
    .filter((m) => (m.score ?? 0) >= MIN_SCORE && m.metadata?.text)
    .map((m) => ({
      source: m.metadata!.source,
      page: m.metadata!.page,
      text: m.metadata!.text,
      score: m.score ?? 0,
    }));
}
