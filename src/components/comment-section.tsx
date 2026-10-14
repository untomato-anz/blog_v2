import Image from "next/image";
import Link from "next/link";
import { deleteComment } from "@/app/actions/comments";
import { CommentForm } from "@/components/comment-form";
import { formatDate } from "@/components/post-card";
import { createClient } from "@/lib/supabase/server";

type Props = {
  postId: string;
  postAuthorId: string;
  viewerId: string | null;
  canComment: boolean;
};

export async function CommentSection({
  postId,
  postAuthorId,
  viewerId,
  canComment,
}: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select(
      "id, body, created_at, parent_id, author_id, profiles!comments_author_id_fkey(username, full_name, avatar_url)",
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const comments = data ?? [];
  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  function Item({
    c,
    isReply,
  }: {
    c: (typeof comments)[number];
    isReply: boolean;
  }) {
    const author = c.profiles;
    const canDelete = viewerId === c.author_id || viewerId === postAuthorId;
    return (
      <li className="flex flex-col gap-2 py-3">
        <div className="flex items-center gap-2 text-sm">
          {author?.avatar_url && (
            <Image
              src={author.avatar_url}
              alt=""
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          {author?.username ? (
            <Link href={`/@${author.username}`} className="font-medium">
              {author.full_name ?? author.username}
            </Link>
          ) : (
            <span className="font-medium">알 수 없음</span>
          )}
          <span className="text-xs text-zinc-500">
            {formatDate(c.created_at)}
          </span>
          {canDelete && (
            <form action={deleteComment} className="ml-auto">
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="text-xs text-zinc-500 hover:underline">
                삭제
              </button>
            </form>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6">{c.body}</p>
        {!isReply && canComment && (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-zinc-500">
              답글 달기
            </summary>
            <div className="mt-2">
              <CommentForm
                postId={postId}
                parentId={c.id}
                placeholder="답글을 남겨 보세요"
                compact
              />
            </div>
          </details>
        )}
      </li>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">댓글 {comments.length}</h2>
      {canComment ? (
        <CommentForm postId={postId} />
      ) : (
        <p className="text-sm text-zinc-500">
          로그인하면 댓글을 남길 수 있습니다.
        </p>
      )}
      <ul className="divide-y divide-black/10 dark:divide-white/15">
        {topLevel.map((c) => (
          <div key={c.id}>
            <Item c={c} isReply={false} />
            <ul className="ml-6 border-l border-black/10 pl-4 dark:border-white/15">
              {repliesOf(c.id).map((r) => (
                <Item key={r.id} c={r} isReply />
              ))}
            </ul>
          </div>
        ))}
      </ul>
    </section>
  );
}
