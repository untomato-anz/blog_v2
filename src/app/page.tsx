import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { JsonLd } from "@/components/json-ld";
import { PostCard } from "@/components/post-card";
import { getCurrentUser } from "@/lib/auth";
import { websiteLd } from "@/lib/blog/jsonld";
import { getPopularTags } from "@/lib/blog/public";
import { POST_CARD_SELECT, type PostCardData } from "@/lib/blog/queries";
import { SITE_TITLE, tagPath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: SITE_TITLE },
};

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-12">
      <JsonLd data={websiteLd()} />
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          생각을 기록하고,
          <br />
          함께 나누는 공간
        </h1>
        <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Google 계정 하나로 바로 가입하고 나만의 글을 써 보세요.
        </p>
        <Suspense fallback={<div className="h-12" />}>
          <HeroCta />
        </Suspense>
        <Suspense fallback={null}>
          <PopularTags />
        </Suspense>
      </section>

      <section>
        <h2 className="border-b border-black/10 pb-3 text-lg font-bold dark:border-white/15">
          최신 글
        </h2>
        <Suspense fallback={null}>
          <LatestPosts />
        </Suspense>
      </section>
    </main>
  );
}

async function HeroCta() {
  const user = await getCurrentUser();

  if (user && !user.username) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-base font-medium">
          거의 다 왔어요! 블로그 아이디만 정하면 시작할 수 있어요.
        </p>
        <Link
          href="/welcome"
          className="flex h-12 items-center rounded-full bg-foreground px-6 font-medium text-background"
        >
          블로그 아이디 정하기
        </Link>
      </div>
    );
  }

  if (user) {
    return (
      <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
        {user.fullName ?? user.email}님, 다시 오신 것을 환영합니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <GoogleSignInButton size="lg" />
      <p className="text-sm text-zinc-500">
        처음이라면 로그인과 동시에 자동으로 회원가입됩니다.
      </p>
    </div>
  );
}

async function LatestPosts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_CARD_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(20);

  const posts = (data ?? []) as unknown as PostCardData[];
  if (!posts.length) {
    return (
      <p className="py-10 text-center text-zinc-500">
        아직 올라온 글이 없습니다. 첫 글을 써 보세요!
      </p>
    );
  }
  return posts.map((p) => <PostCard key={p.id} post={p} />);
}

async function PopularTags() {
  const tags = await getPopularTags();
  if (!tags.length) return null;
  return (
    <nav aria-label="인기 태그" className="flex flex-wrap justify-center gap-2">
      {tags.map(({ tag, count }) => (
        <Link
          key={tag}
          href={tagPath(tag)}
          className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
        >
          #{tag} <span className="text-xs text-zinc-400">{count}</span>
        </Link>
      ))}
    </nav>
  );
}
