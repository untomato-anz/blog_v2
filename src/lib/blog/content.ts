// Pure helpers shared by the editor (live SEO checks) and the server (save + render).

type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type Heading = { level: 2 | 3; text: string; id: string };
export type FaqItem = { question: string; answer: string };
export type SourceItem = { title: string; url: string };

const KOREAN_CHARS_PER_MINUTE = 500;

export function slugify(input: string, max = 80): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function textOf(node: Node): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(textOf).join("");
}

export function analyzeContent(doc: unknown) {
  const headings: Heading[] = [];
  const images: { src: string; alt: string }[] = [];
  const blocks: string[] = [];
  const paragraphs: string[] = [];
  let linkCount = 0;
  const usedIds = new Map<string, number>();

  function walk(node: Node) {
    if (node.type === "heading") {
      const level = node.attrs?.level === 3 ? 3 : 2;
      const text = textOf(node).trim();
      if (text) {
        const base = slugify(text, 50) || "section";
        const n = usedIds.get(base) ?? 0;
        usedIds.set(base, n + 1);
        headings.push({ level, text, id: n ? `${base}-${n + 1}` : base });
      }
    }
    if (node.type === "image" && typeof node.attrs?.src === "string") {
      images.push({
        src: node.attrs.src,
        alt: typeof node.attrs.alt === "string" ? node.attrs.alt : "",
      });
    }
    if (node.marks?.some((m) => m.type === "link")) linkCount += 1;
    if (node.type === "paragraph" || node.type === "heading") {
      blocks.push(textOf(node));
    }
    if (node.type === "paragraph") {
      const t = textOf(node).replace(/\s+/g, " ").trim();
      if (t) paragraphs.push(t);
    }
    node.content?.forEach(walk);
  }
  walk((doc ?? {}) as Node);

  const plain = blocks.join(" ").replace(/\s+/g, " ").trim();
  const wordCount = plain ? plain.split(" ").length : 0;
  const charCount = plain.replace(/\s/g, "").length;

  return {
    headings,
    paragraphs,
    images,
    linkCount,
    plain,
    wordCount,
    charCount,
    readingMinutes: Math.max(1, Math.round(charCount / KOREAN_CHARS_PER_MINUTE)),
  };
}

export function excerptFrom(plain: string, max = 160) {
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}

type AutofillMeta = {
  slug: string;
  seoDescription: string;
  summary: string;
  tags: string[];
  coverImageUrl: string | null;
};

/** Builds a 2-sentence summary from the opening paragraphs. */
export function summarize(paragraphs: string[], max = 280): string {
  let text = "";
  for (const p of paragraphs.slice(0, 3)) {
    const sentences = p.split(/(?<=[.!?。！？])\s+/);
    for (const s of sentences) {
      if ((text + " " + s).trim().length > max) return text || s.slice(0, max);
      text = `${text} ${s}`.trim();
      if (text.length >= 80) return text;
    }
  }
  return text;
}

/** Fills empty SEO fields from the content. Returns the merged meta and which fields were filled. */
export function autofillMeta<M extends AutofillMeta>(
  title: string,
  doc: unknown,
  meta: M,
): { meta: M; filled: (keyof AutofillMeta)[] } {
  const a = analyzeContent(doc);
  const next = { ...meta };
  const filled: (keyof AutofillMeta)[] = [];

  if (!next.summary.trim() && a.paragraphs.length) {
    next.summary = summarize(a.paragraphs);
    if (next.summary) filled.push("summary");
  }
  if (!next.seoDescription.trim()) {
    next.seoDescription = excerptFrom(next.summary || a.plain, 155);
    if (next.seoDescription) filled.push("seoDescription");
  }
  if (!next.slug.trim() && title.trim()) {
    next.slug = slugify(title);
    filled.push("slug");
  }
  if (!next.coverImageUrl && a.images[0]) {
    next.coverImageUrl = a.images[0].src;
    filled.push("coverImageUrl");
  }
  return { meta: next, filled };
}

/** Candidate tags that actually appear in the title or body. */
export function suggestTags(candidates: string[], title: string, plain: string, existing: string[]) {
  const haystack = `${title} ${plain}`.toLowerCase();
  return candidates
    .filter((t) => !existing.includes(t) && haystack.includes(t.replace(/-/g, " ")))
    .slice(0, 8);
}

export function parseFaq(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => ({
      question: String((v as FaqItem)?.question ?? "").trim().slice(0, 200),
      answer: String((v as FaqItem)?.answer ?? "").trim().slice(0, 1000),
    }))
    .filter((f) => f.question && f.answer)
    .slice(0, 10);
}

export function parseSources(value: unknown): SourceItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => ({
      title: String((v as SourceItem)?.title ?? "").trim().slice(0, 200),
      url: String((v as SourceItem)?.url ?? "").trim().slice(0, 500),
    }))
    .filter((s) => /^https?:\/\//i.test(s.url))
    .map((s) => ({ ...s, title: s.title || s.url }))
    .slice(0, 20);
}

export function normalizeTags(value: unknown): string[] {
  const list = Array.isArray(value) ? value : [];
  const seen = new Set<string>();
  for (const raw of list) {
    const tag = String(raw).trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase().slice(0, 30);
    if (tag && !/[/?#%]/.test(tag)) seen.add(tag);
  }
  return [...seen].slice(0, 10);
}
