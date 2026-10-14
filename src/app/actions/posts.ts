"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  analyzeContent,
  excerptFrom,
  normalizeTags,
  parseFaq,
  parseSources,
  slugify,
} from "@/lib/blog/content";
import { POSTS_TAG } from "@/lib/blog/public";
import { postPath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type PostMeta = {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  summary: string;
  tags: string[];
  faq: { question: string; answer: string }[];
  sources: { title: string; url: string }[];
  coverImageUrl: string | null;
  coverImageAlt: string;
};

export type SavePostInput = {
  id?: string;
  title: string;
  /** Tiptap document serialized with JSON.stringify. */
  content: string;
  meta: PostMeta;
  publish: boolean;
};

const clip = (value: string, max: number) => value.trim().slice(0, max) || null;

export async function savePost(
  input: SavePostInput,
): Promise<{ error: string }> {
  const user = await requireUser();
  const title = input.title.trim();

  if (title.length > 200) return { error: "제목은 200자 이내로 입력해 주세요." };
  if (input.publish && !title) return { error: "발행하려면 제목이 필요합니다." };
  if (input.content.length > 1_000_000) return { error: "본문이 너무 깁니다." };

  let doc: Json;
  try {
    doc = JSON.parse(input.content) as Json;
  } catch {
    return { error: "본문 형식이 올바르지 않습니다." };
  }
  if (!doc || typeof doc !== "object" || (doc as { type?: unknown }).type !== "doc") {
    return { error: "본문 형식이 올바르지 않습니다." };
  }

  const supabase = await createClient();
  const analysis = analyzeContent(doc);
  const meta = input.meta;

  const baseSlug = slugify(meta.slug || title) || "post";
  const slug = await uniqueSlug(supabase, user.id, baseSlug, input.id);

  const coverFromContent = analysis.images[0];
  const coverImageUrl =
    meta.coverImageUrl && analysis.images.some((i) => i.src === meta.coverImageUrl)
      ? meta.coverImageUrl
      : (coverFromContent?.src ?? null);
  const coverAlt =
    meta.coverImageAlt ||
    analysis.images.find((i) => i.src === coverImageUrl)?.alt ||
    "";

  const fields = {
    title,
    content: doc,
    slug,
    excerpt: excerptFrom(analysis.plain),
    seo_title: clip(meta.seoTitle, 70),
    seo_description: clip(meta.seoDescription, 200),
    summary: clip(meta.summary, 500),
    tags: normalizeTags(meta.tags),
    faq: parseFaq(meta.faq) as Json,
    sources: parseSources(meta.sources) as Json,
    cover_image_url: coverImageUrl,
    cover_image_alt: clip(coverAlt, 200),
    word_count: analysis.wordCount,
    reading_minutes: analysis.readingMinutes,
    content_updated_at: new Date().toISOString(),
  };

  let postId = input.id;
  let published = input.publish;

  if (postId) {
    const { data: existing } = await supabase
      .from("posts")
      .select("status, published_at")
      .eq("id", postId)
      .eq("author_id", user.id)
      .maybeSingle();
    if (!existing) return { error: "글을 찾을 수 없습니다." };

    published = input.publish || existing.status === "published";
    const { error } = await supabase
      .from("posts")
      .update({
        ...fields,
        status: published ? "published" : "draft",
        published_at: published
          ? (existing.published_at ?? new Date().toISOString())
          : null,
      })
      .eq("id", postId)
      .eq("author_id", user.id);
    if (error) return { error: "저장하지 못했습니다. 다시 시도해 주세요." };
  } else {
    const { data, error } = await supabase
      .from("posts")
      .insert({
        ...fields,
        author_id: user.id,
        status: published ? "published" : "draft",
        published_at: published ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !data) return { error: "저장하지 못했습니다. 다시 시도해 주세요." };
    postId = data.id;
  }

  updateTag(POSTS_TAG);
  revalidatePath("/", "layout");
  redirect(
    published ? postPath(user.username, slug) : `/posts/${postId}/edit?saved=1`,
  );
}

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  authorId: string,
  base: string,
  currentId?: string,
) {
  const { data } = await supabase
    .from("posts")
    .select("id, slug")
    .eq("author_id", authorId)
    .like("slug", `${base.replace(/[%_]/g, "\\$&")}%`);
  const taken = new Set(
    (data ?? []).filter((p) => p.id !== currentId).map((p) => p.slug),
  );
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

export async function unpublishPost(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase
    .from("posts")
    .update({ status: "draft", published_at: null })
    .eq("id", id)
    .eq("author_id", user.id);
  updateTag(POSTS_TAG);
  revalidatePath("/", "layout");
  redirect("/drafts");
}

export async function deletePost(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", id).eq("author_id", user.id);
  updateTag(POSTS_TAG);
  revalidatePath("/", "layout");
  redirect(`/@${user.username}`);
}
