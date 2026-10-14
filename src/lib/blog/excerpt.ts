type Node = { type?: string; text?: string; content?: Node[] };

function collect(node: Node, out: string[]) {
  if (node.text) out.push(node.text);
  node.content?.forEach((child) => collect(child, out));
  if (node.type === "paragraph" || node.type === "heading") out.push(" ");
}

export function extractExcerpt(doc: unknown, max = 160): string {
  const out: string[] = [];
  collect(doc as Node, out);
  const text = out.join("").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function extractFirstImage(doc: unknown): string | null {
  const stack: Node[] = [doc as Node];
  while (stack.length) {
    const n = stack.shift()!;
    const src = (n as { attrs?: { src?: string } }).attrs?.src;
    if (n.type === "image" && src) return src;
    if (n.content) stack.unshift(...n.content);
  }
  return null;
}
