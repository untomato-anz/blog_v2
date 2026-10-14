import "server-only";
import { generateHTML } from "@tiptap/html/server";
import type { Json } from "@/lib/supabase/database.types";
import { analyzeContent } from "./content";
import { baseExtensions } from "./extensions";

/** Renders stored Tiptap JSON to HTML and gives h2/h3 stable ids for the table of contents. */
export function renderContent(content: Json) {
  const { headings } = analyzeContent(content);
  let html = "";
  try {
    html = generateHTML(content as never, baseExtensions);
  } catch {
    return { html: "", headings: [] };
  }

  let i = 0;
  html = html.replace(/<h([23])>/g, (match, level) => {
    const h = headings[i];
    if (!h || String(h.level) !== level) return match;
    i += 1;
    return `<h${level} id="${h.id}">`;
  });

  return { html, headings };
}
