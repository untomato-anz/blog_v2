"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createComment(formData: FormData) {
  const user = await requireUser();
  const postId = String(formData.get("postId"));
  const parentId = String(formData.get("parentId") ?? "") || null;
  const body = String(formData.get("body") ?? "").trim();
  if (!body || body.length > 2000) return;

  const supabase = await createClient();
  await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, parent_id: parentId, body });
  revalidatePath("/", "layout");
}

export async function deleteComment(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  // RLS also lets a post's author remove comments on their own post.
  await supabase.from("comments").delete().eq("id", id);
  void user;
  revalidatePath("/", "layout");
}
