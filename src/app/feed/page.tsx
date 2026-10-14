import { Suspense } from "react";
import { PostCard } from "@/components/post-card";
import { requireUser } from "@/lib/auth";
import { POST_CARD_SELECT, type PostCardData } from "@/lib/blog/queries";
import { createClient } from "@/lib/supabase/server";

export default function FeedPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <h1 className="mb-2 text-2xl font-bold">팔로잉 피드</h1>
      <Suspense fallback={null}>
        <Feed />
      </Suspense>
    </main>
  );
}

async function Feed() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const ids = (follows ?? []).map((f) => f.following_id);

  if (!ids.length) {
    return (
      <p className="py-10 text-center text-zinc-500">
        아직 팔로우한 회원이 없습니다. 마음에 드는 블로그를 팔로우해 보세요.
      </p>
    );
  }

  const { data } = await supabase
    .from("posts")
    .select(POST_CARD_SELECT)
    .in("author_id", ids)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(30);

  const posts = (data ?? []) as unknown as PostCardData[];
  if (!posts.length) {
    return (
      <p className="py-10 text-center text-zinc-500">
        팔로우한 회원의 새 글이 아직 없습니다.
      </p>
    );
  }
  return posts.map((p) => <PostCard key={p.id} post={p} />);
}
