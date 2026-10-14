"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { extractExcerpt, extractFirstImage } from "@/lib/blog/excerpt";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

export type SavePostInput = {
  id?: string;
  title: string;
  /** Tiptap document serialized with JSON.stringify. */
  content: string;
  publish: boolean;
};

export async function savePost(
  input: SavePostInput,
): Promise<{ error: string }> {
  const user = await requireUser();
  const title = input.title.trim();

  if (title.length > 200) return { error: "제목은 200자 이내로 입력해 주세요." };
  if (input.publish && !title) return { error: "발행하려면 제목이 필요합니다." };
  if (input.content.length > 1_000_000) {
    return { error: "본문이 너무 깁니다." };
  }

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
  const fields = {
    title,
    content: doc,
    excerpt: extractExcerpt(doc),
    cover_image_url: extractFirstImage(doc),
  };

  let postId = input.id;

  if (postId) {
    const { data: existing } = await supabase
      .from("posts")
      .select("status, published_at")
      .eq("id", postId)
      .eq("author_id", user.id)
      .maybeSingle();
    if (!existing) return { error: "글을 찾을 수 없습니다." };

    const wasPublished = existing.status === "published";
    const status = input.publish || wasPublished ? "published" : "draft";
    const { error } = await supabase
      .from("posts")
      .update({
        ...fields,
        status,
        published_at:
          status === "published"
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
        status: input.publish ? "published" : "draft",
        published_at: input.publish ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !data) return { error: "저장하지 못했습니다. 다시 시도해 주세요." };
    postId = data.id;
  }

  revalidatePath("/", "layout");
  redirect(
    input.publish
      ? `/@${user.username}/${postId}`
      : `/posts/${postId}/edit?saved=1`,
  );
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
  revalidatePath("/", "layout");
  redirect("/drafts");
}

export async function deletePost(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", id).eq("author_id", user.id);
  revalidatePath("/", "layout");
  redirect(`/@${user.username}`);
}
