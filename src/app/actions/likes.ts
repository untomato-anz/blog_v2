"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function toggleLike(postId: string, like: boolean) {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  if (like) {
    await supabase
      .from("likes")
      .upsert(
        { post_id: postId, user_id: user.id },
        { onConflict: "post_id,user_id", ignoreDuplicates: true },
      );
  } else {
    await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
  }
  revalidatePath("/", "layout");
}
