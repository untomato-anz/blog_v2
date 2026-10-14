import type { Metadata } from "next";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { PostCard } from "@/components/post-card";
import { breadcrumbLd, collectionPageLd } from "@/lib/blog/jsonld";
import { getPostsByTag } from "@/lib/blog/public";
import { safeDecode } from "@/lib/params";
import { SITE_NAME, tagPath } from "@/lib/site";

type Params = PageProps<"/tags/[tag]">["params"];

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const tag = safeDecode((await params).tag);
  const posts = await getPostsByTag(tag);
  const title = `#${tag} 글 모아보기`;
  const description = `${SITE_NAME}에서 '${tag}' 태그로 작성된 글 ${posts.length}개를 모았어요.`;
  return {
    title,
    description,
    alternates: { canonical: tagPath(tag) },
    // Thin pages stay out of the index until there is something to show.
    robots: posts.length === 0 ? { index: false, follow: true } : undefined,
    openGraph: { type: "website", url: tagPath(tag), title, description },
  };
}

export default function TagPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Suspense fallback={null}>
        <Posts params={params} />
      </Suspense>
    </main>
  );
}

async function Posts({ params }: { params: Params }) {
  const tag = safeDecode((await params).tag);
  const posts = await getPostsByTag(tag);

  return (
    <>
      <JsonLd
        data={collectionPageLd({
          name: `#${tag} 글 모아보기`,
          path: tagPath(tag),
          items: posts.flatMap((p) =>
            p.slug && p.profiles?.username
              ? [{ title: p.title, username: p.profiles.username, slug: p.slug }]
              : [],
          ),
        })}
      />
      <JsonLd
        data={breadcrumbLd([
          { name: "홈", path: "/" },
          { name: `#${tag}`, path: tagPath(tag) },
        ])}
      />
      <h1 className="text-2xl font-bold">#{tag}</h1>
      <p className="mb-4 text-sm text-zinc-500">글 {posts.length}개</p>
      {posts.length ? (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      ) : (
        <p className="py-10 text-center text-zinc-500">
          이 태그로 쓰인 글이 아직 없습니다.
        </p>
      )}
    </>
  );
}
