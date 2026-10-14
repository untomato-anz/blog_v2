import "server-only";
import { generateHTML } from "@tiptap/html/server";
import type { Json } from "@/lib/supabase/database.types";
import { baseExtensions } from "./extensions";

export function renderContent(content: Json): string {
  try {
    return generateHTML(content as never, baseExtensions);
  } catch {
    return "";
  }
}
