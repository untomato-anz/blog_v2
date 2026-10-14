import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { deletePost, unpublishPost } from "@/app/actions/posts";
import { CommentSection } from "@/components/comment-section";
import { LikeButton } from "@/components/like-button";
import { formatDate } from "@/components/post-card";
import { ViewTracker } from "@/components/view-tracker";
import { getCurrentUser } from "@/lib/auth";
import { renderContent } from "@/lib/blog/render";
import { createClient } from "@/lib/supabase/server";

export default function PostPage({ params }: PageProps<"/[handle]/[postId]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Suspense fallback={null}>
        <Post params={params} />
      </Suspense>
    </main>
  );
}

async function Post({
  params,
}: {
  params: PageProps<"/[handle]/[postId]">["params"];
}) {
  const { handle: rawHandle, postId } = await params;
  const handle = decodeURIComponent(rawHandle);
  if (!handle.startsWith("@")) notFound();
  if (!/^[0-9a-f-]{36}$/i.test(postId)) notFound();

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, author_id, title, content, status, published_at, view_count, like_count, comment_count, profiles!posts_author_id_fkey(username, full_name, avatar_url)",
    )
    .eq("id", postId)
    .maybeSingle();

  const author = post?.profiles;
  if (!post || !author || author.username !== handle.slice(1).toLowerCase()) {
    notFound();
  }

  const viewer = await getCurrentUser();
  const isAuthor = viewer?.id === post.author_id;
  const isPublished = post.status === "published";

  const { data: likeRow } = viewer
    ? await supabase
        .from("likes")
        .select("post_id")
        .eq("post_id", post.id)
        .eq("user_id", viewer.id)
        .maybeSingle()
    : { data: null };

  const html = renderContent(post.content);

  return (
    <article className="flex flex-col gap-8">
      {isPublished && !isAuthor && <ViewTracker postId={post.id} />}
      <header className="flex flex-col gap-4">
        {!isPublished && (
          <p className="rounded bg-yellow-100 px-3 py-2 text-sm text-yellow-900">
            임시저장 상태입니다. 나만 볼 수 있습니다.
          </p>
        )}
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          {post.title || "제목 없음"}
        </h1>
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          {author.avatar_url && (
            <Image
              src={author.avatar_url}
              alt=""
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <Link href={`/@${author.username}`} className="font-medium">
            {author.full_name ?? author.username}
          </Link>
          <span>{formatDate(post.published_at)}</span>
          <span>조회 {post.view_count}</span>
        </div>
        {isAuthor && (
          <div className="flex gap-3 text-sm">
            <Link href={`/posts/${post.id}/edit`} className="underline">
              수정
            </Link>
            {isPublished && (
              <form action={unpublishPost}>
                <input type="hidden" name="id" value={post.id} />
                <button type="submit" className="underline">
                  비공개로 전환
                </button>
              </form>
            )}
            <form action={deletePost}>
              <input type="hidden" name="id" value={post.id} />
              <button type="submit" className="text-red-600 underline">
                삭제
              </button>
            </form>
          </div>
        )}
      </header>

      <div
        className="post-content"
        // Generated from the Tiptap JSON by a fixed extension schema, not from user HTML.
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {isPublished && (
        <>
          <div>
            <LikeButton
              postId={post.id}
              liked={!!likeRow}
              count={post.like_count}
              canLike={!!viewer}
            />
          </div>
          <CommentSection
            postId={post.id}
            postAuthorId={post.author_id}
            viewerId={viewer?.id ?? null}
            canComment={!!viewer?.username}
          />
        </>
      )}
    </article>
  );
}
