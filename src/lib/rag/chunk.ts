import { CHUNK_OVERLAP, CHUNK_SIZE } from "./config";

/** Splits text into overlapping chunks, preferring paragraph/sentence boundaries. */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const cut = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf(". "),
        window.lastIndexOf("다. "),
        window.lastIndexOf("\n"),
      );
      if (cut > size * 0.5) end = start + cut + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece.length > 40) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
