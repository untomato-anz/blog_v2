/**
 * Indexes PDF files into Pinecone.
 *
 *   npm run rag:ingest            -> indexes every PDF in ./rag-docs
 *   npm run rag:ingest -- --reset -> clears the namespace first
 *   npm run rag:ingest -- path/a.pdf path/b.pdf
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import { chunkText } from "../src/lib/rag/chunk";
import { RAG_INDEX_NAME, RAG_NAMESPACE } from "../src/lib/rag/config";
import { embedTexts } from "../src/lib/rag/embed";
import { clearNamespace, ensureIndex, upsertChunks, type ChunkMetadata } from "../src/lib/rag/store";

const DOCS_DIR = path.resolve("rag-docs");

function idFor(source: string, page: number, i: number) {
  const safe = Buffer.from(source).toString("hex").slice(0, 40);
  return `${safe}-${page}-${i}`;
}

async function pdfFiles(args: string[]) {
  if (args.length) return args.map((a) => path.resolve(a));
  const names = await readdir(DOCS_DIR).catch(() => []);
  return names.filter((n) => n.toLowerCase().endsWith(".pdf")).map((n) => path.join(DOCS_DIR, n));
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes("--reset");
  const files = await pdfFiles(args.filter((a) => !a.startsWith("--")));

  if (!files.length) {
    console.log(`PDF가 없습니다. ${DOCS_DIR} 폴더에 PDF를 넣고 다시 실행하세요.`);
    return;
  }

  await ensureIndex();
  if (reset) {
    await clearNamespace();
    console.log("namespace cleared");
  }

  let total = 0;
  for (const file of files) {
    const source = path.basename(file);
    const pdf = await getDocumentProxy(new Uint8Array(await readFile(file)));
    const { text: pages } = await extractText(pdf, { mergePages: false });

    const items: { id: string; text: string; page: number }[] = [];
    pages.forEach((pageText, pageIdx) => {
      chunkText(pageText).forEach((text, i) => {
        items.push({ id: idFor(source, pageIdx + 1, i), text, page: pageIdx + 1 });
      });
    });

    if (!items.length) {
      console.log(`${source}: 추출된 텍스트가 없습니다 (스캔본 PDF일 수 있어요)`);
      continue;
    }

    const vectors = await embedTexts(
      items.map((it) => `${source}\n${it.text}`),
      "RETRIEVAL_DOCUMENT",
    );
    await upsertChunks(
      items.map((it, i) => ({
        id: it.id,
        values: vectors[i],
        metadata: { source, page: it.page, text: it.text } satisfies ChunkMetadata,
      })),
    );
    total += items.length;
    console.log(`${source}: ${pages.length}쪽, ${items.length}개 청크 저장`);
  }

  console.log(`완료: ${total}개 청크 -> ${RAG_INDEX_NAME}/${RAG_NAMESPACE}`);
}

main().catch((e) => {
  console.error("ingest failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
