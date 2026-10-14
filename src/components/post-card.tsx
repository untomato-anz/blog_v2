import Image from "next/image";
import Link from "next/link";
import type { PostCardData } from "@/lib/blog/queries";
import { postPath, profilePath, tagPath } from "@/lib/site";

export function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}

export function PostCard({ post }: { post: PostCardData }) {
  const author = post.profiles;
  const href =
    author?.username && post.slug ? postPath(author.username, post.slug) : "#";
  const description = post.summary || post.excerpt;

  return (
    <article className="flex gap-4 border-b border-black/10 py-6 dark:border-white/15">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {author?.username && (
          <Link
            href={profilePath(author.username)}
            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
          >
            {author.avatar_url && (
              <Image
                src={author.avatar_url}
                alt=""
                width={20}
                height={20}
                className="rounded-full"
              />
            )}
            {author.full_name ?? author.username}
          </Link>
        )}
        <Link href={href} className="flex flex-col gap-1">
          <h2 className="truncate text-xl font-bold">
            {post.title || "제목 없음"}
          </h2>
          <p className="line-clamp-2 text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        </Link>
        {post.tags?.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 4).map((t) => (
              <li key={t}>
                <Link
                  href={tagPath(t)}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  #{t}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-zinc-500">
          {post.published_at && (
            <time dateTime={post.published_at}>
              {formatDate(post.published_at)}
            </time>
          )}{" "}
          · {post.reading_minutes}분 읽기 · 조회 {post.view_count} · 좋아요{" "}
          {post.like_count} · 댓글 {post.comment_count}
        </p>
      </div>
      {post.cover_image_url && (
        <Link href={href} className="shrink-0">
          <Image
            src={post.cover_image_url}
            alt={post.cover_image_alt ?? ""}
            width={112}
            height={112}
            className="h-28 w-28 rounded-lg object-cover"
          />
        </Link>
      )}
    </article>
  );
}
