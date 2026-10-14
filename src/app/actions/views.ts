"use server";

import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const VIEWER_COOKIE = "viewer_id";

// Counts at most one view per visitor per post per day (enforced by the table's primary key).
export async function recordView(postId: string) {
  const user = await getCurrentUser();
  const cookieStore = await cookies();

  let viewerKey = user?.id ?? cookieStore.get(VIEWER_COOKIE)?.value;
  if (!viewerKey) {
    viewerKey = crypto.randomUUID();
    cookieStore.set(VIEWER_COOKIE, viewerKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  const supabase = await createClient();
  await supabase
    .from("post_views")
    .upsert(
      { post_id: postId, viewer_key: viewerKey },
      { onConflict: "post_id,viewer_key,viewed_on", ignoreDuplicates: true },
    );
}
