import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import { POST_CARD_SELECT, type PostCardData } from "./queries";

// Cookie-less client for public, cacheable reads. RLS limits it to published posts.
function publicClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const POSTS_TAG = "posts";
export const PROFILES_TAG = "profiles";

const POST_DETAIL_SELECT =
  "id, author_id, slug, title, content, excerpt, summary, seo_title, seo_description, tags, faq, sources, cover_image_url, cover_image_alt, status, published_at, content_updated_at, word_count, reading_minutes, view_count, like_count, comment_count, profiles!posts_author_id_fkey!inner(username, full_name, avatar_url, bio)" as const;

export async function getPublicProfile(username: string) {
  "use cache";
  cacheTag(PROFILES_TAG);
  cacheLife("minutes");
  const { data } = await publicClient()
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio")
    .eq("username", username)
    .maybeSingle();
  return data;
}

export async function getPublicPost(username: string, slug: string) {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("minutes");
  const { data } = await publicClient()
    .from("posts")
    .select(POST_DETAIL_SELECT)
    .eq("profiles.username", username)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
}

export type PublicPost = NonNullable<Awaited<ReturnType<typeof getPublicPost>>>;

export async function getPublicPostSlugById(id: string) {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("minutes");
  const { data } = await publicClient()
    .from("posts")
    .select("slug, profiles!posts_author_id_fkey(username)")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  return data?.slug && data.profiles?.username
    ? { slug: data.slug, username: data.profiles.username }
    : null;
}

export async function getRelatedPosts(postId: string, authorId: string, tags: string[]) {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("minutes");
  const supabase = publicClient();
  const byTag = tags.length
    ? await supabase
        .from("posts")
        .select(POST_CARD_SELECT)
        .eq("status", "published")
        .overlaps("tags", tags)
        .neq("id", postId)
        .order("published_at", { ascending: false })
        .limit(3)
    : { data: [] };
  const sameAuthor = await supabase
    .from("posts")
    .select(POST_CARD_SELECT)
    .eq("status", "published")
    .eq("author_id", authorId)
    .neq("id", postId)
    .order("published_at", { ascending: false })
    .limit(3);

  const seen = new Set<string>();
  return [...(byTag.data ?? []), ...(sameAuthor.data ?? [])]
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .slice(0, 4) as unknown as PostCardData[];
}

export async function getPostsByTag(tag: string) {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("minutes");
  const { data } = await publicClient()
    .from("posts")
    .select(POST_CARD_SELECT)
    .eq("status", "published")
    .contains("tags", [tag])
    .order("published_at", { ascending: false })
    .limit(50);
  return (data ?? []) as unknown as PostCardData[];
}

export async function getPopularTags(limit = 12) {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("minutes");
  const { data } = await publicClient()
    .from("posts")
    .select("tags")
    .eq("status", "published")
    .limit(1000);
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const t of row.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

export async function getSitemapEntries() {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("hours");
  const supabase = publicClient();
  const [posts, profiles] = await Promise.all([
    supabase
      .from("posts")
      .select("slug, tags, content_updated_at, profiles!posts_author_id_fkey(username)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(5000),
    supabase.from("profiles").select("username, updated_at").not("username", "is", null),
  ]);
  return { posts: posts.data ?? [], profiles: profiles.data ?? [] };
}

export async function getFeedPosts() {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("minutes");
  const { data } = await publicClient()
    .from("posts")
    .select(
      "title, slug, summary, excerpt, seo_description, tags, published_at, content_updated_at, profiles!posts_author_id_fkey(username, full_name)",
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);
  return data ?? [];
}
