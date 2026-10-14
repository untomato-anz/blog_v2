import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getPopularTags } from "./public";

/** Extra data the editor needs: author bio status and tags worth suggesting. */
export async function getEditorContext(userId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: mine }, popular] = await Promise.all([
    supabase.from("profiles").select("bio").eq("id", userId).maybeSingle(),
    supabase
      .from("posts")
      .select("tags")
      .eq("author_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50),
    getPopularTags(20),
  ]);

  const candidates = new Set<string>();
  for (const row of mine ?? []) row.tags?.forEach((t) => candidates.add(t));
  popular.forEach(({ tag }) => candidates.add(tag));

  return {
    hasBio: !!profile?.bio?.trim(),
    tagCandidates: [...candidates],
  };
}
