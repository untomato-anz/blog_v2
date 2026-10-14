// Shared settings for the RAG pipeline. Server/CLI only: never import from client components.
export const RAG_INDEX_NAME = process.env.PINECONE_INDEX || "hihere-docs";
export const RAG_NAMESPACE = process.env.PINECONE_NAMESPACE || "docs";

export const EMBED_MODEL = process.env.EMBED_MODEL || "gemini-embedding-001";
// Dimension of the Pinecone index. Must match the vectors we upsert.
export const EMBED_DIMENSION = 1024;

export const CHUNK_SIZE = 900;
export const CHUNK_OVERLAP = 150;

export const TOP_K = 4;
// Cosine similarity below this is treated as "not relevant".
export const MIN_SCORE = 0.55;
