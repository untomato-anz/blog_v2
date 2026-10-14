import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { deletePost, unpublishPost } from "@/app/actions/posts";
import { CommentSection } from "@/components/comment-section";
import { JsonLd } from "@/components/json-ld";
import { LikeButton } from "@/components/like-button";
import { PostCard, formatDate } from "@/components/post-card";
import { ViewTracker } from "@/components/view-tracker";
import { getCurrentUser } from "@/lib/auth";
import { isUuid, normalizeTags, parseFaq, parseSources } from "@/lib/blog/content";
import { blogPostingLd, breadcrumbLd, faqLd } from "@/lib/blog/jsonld";
import {
  getPublicPost,
  getPublicPostSlugById,
  getRelatedPosts,
  type PublicPost,
} from "@/lib/blog/public";
import { renderContent } from "@/lib/blog/render";
import { parseHandle, safeDecode } from "@/lib/params";
import { absoluteUrl, DEFAULT_OG_IMAGE, postPath, profilePath, tagPath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

type Params = PageProps<"/[handle]/[slug]">["params"];

function describe(post: PublicPost) {
  return (post.seo_description || post.summary || post.excerpt || "").slice(0, 160);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle, slug: rawSlug } = await params;
  const username = parseHandle(handle);
  const slug = safeDecode(rawSlug);
  if (!username || isUuid(slug)) return {};

  const post = await getPublicPost(username, slug);
  if (!post) return { title: "글을 찾을 수 없습니다", robots: { index: false } };

  const author = post.profiles;
  const url = postPath(username, slug);
  const title = post.seo_title || post.title;
  const description = describe(post);
  const image = post.cover_image_url ?? DEFAULT_OG_IMAGE;
  const tags = normalizeTags(post.tags);

  return {
    title,
    description,
    keywords: tags,
    authors: [{ name: author.full_name ?? username, url: profilePath(username) }],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.content_updated_at,
      authors: [absoluteUrl(profilePath(username))],
      tags,
      images: [{ url: image, alt: post.cover_image_alt ?? title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function PostPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Suspense fallback={null}>
        <Post params={params} />
      </Suspense>
    </main>
  );
}

async function Post({ params }: { params: Params }) {
  const { handle, slug: rawSlug } = await params;
  const username = parseHandle(handle);
  if (!username) notFound();
  const slug = safeDecode(rawSlug);

  if (isUuid(slug)) {
    const target = await getPublicPostSlugById(slug);
    if (target) permanentRedirect(postPath(target.username, target.slug));
  }

  let post = await getPublicPost(username, slug);
  let isDraft = false;
  if (!post) {
    // Authors can preview their own drafts at the same URL.
    const supabase = await createClient();
    const { data } = await supabase
      .from("posts")
      .select(
        "id, author_id, slug, title, content, excerpt, summary, seo_title, seo_description, tags, faq, sources, cover_image_url, cover_image_alt, status, published_at, content_updated_at, word_count, reading_minutes, view_count, like_count, comment_count, profiles!posts_author_id_fkey!inner(username, full_name, avatar_url, bio)",
      )
      .eq("profiles.username", username)
      .eq(isUuid(slug) ? "id" : "slug", slug)
      .maybeSingle();
    if (!data) notFound();
    post = data;
    isDraft = data.status !== "published";
  }

  const author = post.profiles;
  const url = absoluteUrl(postPath(username, post.slug ?? slug));
  const { html, headings } = renderContent(post.content);
  const tags = normalizeTags(post.tags);
  const faq = parseFaq(post.faq);
  const sources = parseSources(post.sources);
  const modifiedLater =
    post.published_at &&
    new Date(post.content_updated_at).getTime() - new Date(post.published_at).getTime() >
      60 * 60 * 1000;

  return (
    <>
      {!isDraft && (
        <>
          <JsonLd
            data={blogPostingLd({
              url,
              headline: post.seo_title || post.title,
              description: describe(post),
              image: post.cover_image_url ?? DEFAULT_OG_IMAGE,
              datePublished: post.published_at,
              dateModified: post.content_updated_at,
              author: { username, full_name: author.full_name, avatar_url: author.avatar_url },
              tags,
              wordCount: post.word_count,
              commentCount: post.comment_count,
              likeCount: post.like_count,
            })}
          />
          <JsonLd
            data={breadcrumbLd([
              { name: "홈", path: "/" },
              { name: author.full_name ?? `@${username}`, path: profilePath(username) },
              { name: post.title, path: postPath(username, post.slug ?? slug) },
            ])}
          />
          {faq.length > 0 && <JsonLd data={faqLd(faq)} />}
        </>
      )}

      <article className="flex flex-col gap-8">
        <nav aria-label="breadcrumb" className="text-sm text-zinc-500">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:underline">홈</Link>
            </li>
            <li aria-hidden>›</li>
            <li>
              <Link href={profilePath(username)} className="hover:underline">
                {author.full_name ?? `@${username}`}
              </Link>
            </li>
          </ol>
        </nav>

        <header className="flex flex-col gap-4">
          {isDraft && (
            <p className="rounded bg-yellow-100 px-3 py-2 text-sm text-yellow-900">
              임시저장 상태입니다. 나만 볼 수 있습니다.
            </p>
          )}
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            {post.title || "제목 없음"}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {author.avatar_url && (
              <Image src={author.avatar_url} alt="" width={32} height={32} className="rounded-full" />
            )}
            <Link href={profilePath(username)} rel="author" className="font-medium text-zinc-900 dark:text-zinc-100">
              {author.full_name ?? username}
            </Link>
            {post.published_at && (
              <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
            )}
            {modifiedLater && (
              <span>
                · 수정 <time dateTime={post.content_updated_at}>{formatDate(post.content_updated_at)}</time>
              </span>
            )}
            <span>· {post.reading_minutes}분 읽기</span>
          </div>
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <li key={t}>
                  <Link
                    href={tagPath(t)}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    #{t}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Suspense fallback={null}>
            <AuthorTools postId={post.id} authorId={post.author_id} isDraft={isDraft} />
          </Suspense>
        </header>

        {post.summary && (
          <section
            aria-label="요약"
            className="rounded-xl border-l-4 border-[#FF5C7A] bg-[#FFF4F6] px-5 py-4 dark:bg-zinc-900"
          >
            <p className="mb-1 text-xs font-bold tracking-wide text-[#FF5C7A]">요약</p>
            <p className="leading-7">{post.summary}</p>
          </section>
        )}

        {headings.length >= 2 && (
          <nav aria-label="목차" className="rounded-xl bg-zinc-50 px-5 py-4 text-sm dark:bg-zinc-900">
            <p className="mb-2 font-semibold">목차</p>
            <ol className="flex flex-col gap-1">
              {headings.map((h) => (
                <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                  <a href={`#${h.id}`} className="text-zinc-600 hover:underline dark:text-zinc-400">
                    {h.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div
          className="post-content"
          // Generated from the Tiptap JSON by a fixed extension schema, not from user HTML.
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {faq.length > 0 && (
          <section aria-labelledby="faq" className="flex flex-col gap-3">
            <h2 id="faq" className="text-xl font-bold">자주 묻는 질문</h2>
            {faq.map((f) => (
              <details key={f.question} className="rounded-lg border border-black/10 px-4 py-3 dark:border-white/15" open>
                <summary className="cursor-pointer font-medium">{f.question}</summary>
                <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{f.answer}</p>
              </details>
            ))}
          </section>
        )}

        {sources.length > 0 && (
          <section aria-labelledby="sources" className="flex flex-col gap-2">
            <h2 id="sources" className="text-lg font-bold">출처 · 참고 자료</h2>
            <ul className="list-disc pl-5 text-sm">
              {sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-600 underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex items-start gap-4 rounded-xl border border-black/10 p-5 dark:border-white/15">
          {author.avatar_url && (
            <Image src={author.avatar_url} alt="" width={56} height={56} className="rounded-full" />
          )}
          <div className="flex flex-col gap-1">
            <p className="text-xs text-zinc-500">글쓴이</p>
            <Link href={profilePath(username)} className="font-bold">
              {author.full_name ?? username}
            </Link>
            {author.bio && <p className="text-sm text-zinc-600 dark:text-zinc-400">{author.bio}</p>}
          </div>
        </section>

        {!isDraft && (
          <Suspense fallback={<div className="h-10" />}>
            <Engagement postId={post.id} authorId={post.author_id} />
          </Suspense>
        )}
      </article>

      {!isDraft && (
        <Suspense fallback={null}>
          <Related postId={post.id} authorId={post.author_id} tags={tags} />
        </Suspense>
      )}
    </>
  );
}

async function AuthorTools({
  postId,
  authorId,
  isDraft,
}: {
  postId: string;
  authorId: string;
  isDraft: boolean;
}) {
  const viewer = await getCurrentUser();
  if (viewer?.id !== authorId) return null;
  return (
    <div className="flex gap-3 text-sm">
      <Link href={`/posts/${postId}/edit`} className="underline">수정</Link>
      {!isDraft && (
        <form action={unpublishPost}>
          <input type="hidden" name="id" value={postId} />
          <button type="submit" className="underline">비공개로 전환</button>
        </form>
      )}
      <form action={deletePost}>
        <input type="hidden" name="id" value={postId} />
        <button type="submit" className="text-red-600 underline">삭제</button>
      </form>
    </div>
  );
}

async function Engagement({ postId, authorId }: { postId: string; authorId: string }) {
  const viewer = await getCurrentUser();
  const supabase = await createClient();
  const [{ data: counts }, { data: likeRow }] = await Promise.all([
    supabase.from("posts").select("view_count, like_count").eq("id", postId).maybeSingle(),
    viewer
      ? supabase.from("likes").select("post_id").eq("post_id", postId).eq("user_id", viewer.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      {viewer?.id !== authorId && <ViewTracker postId={postId} />}
      <div className="flex items-center gap-4">
        <LikeButton
          postId={postId}
          liked={!!likeRow}
          count={counts?.like_count ?? 0}
          canLike={!!viewer}
        />
        <span className="text-sm text-zinc-500">조회 {counts?.view_count ?? 0}</span>
      </div>
      <CommentSection
        postId={postId}
        postAuthorId={authorId}
        viewerId={viewer?.id ?? null}
        canComment={!!viewer?.username}
      />
    </>
  );
}

async function Related({
  postId,
  authorId,
  tags,
}: {
  postId: string;
  authorId: string;
  tags: string[];
}) {
  const posts = await getRelatedPosts(postId, authorId, tags);
  if (!posts.length) return null;
  return (
    <section className="mt-16">
      <h2 className="border-b border-black/10 pb-3 text-lg font-bold dark:border-white/15">
        함께 읽으면 좋은 글
      </h2>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </section>
  );
}
