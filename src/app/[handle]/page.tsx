import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { toggleFollow } from "@/app/actions/follows";
import { JsonLd } from "@/components/json-ld";
import { PostCard } from "@/components/post-card";
import { getCurrentUser } from "@/lib/auth";
import { profilePageLd } from "@/lib/blog/jsonld";
import { getPublicProfile } from "@/lib/blog/public";
import { POST_CARD_SELECT, type PostCardData } from "@/lib/blog/queries";
import { parseHandle } from "@/lib/params";
import { profilePath } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[handle]">): Promise<Metadata> {
  const username = parseHandle((await params).handle);
  if (!username) return {};
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "블로그를 찾을 수 없습니다", robots: { index: false } };

  const name = profile.full_name ?? username;
  const title = `${name} (@${username})의 블로그`;
  const description =
    profile.bio || `${name}님이 hi here에 남긴 글을 모아 보세요.`;
  return {
    title,
    description,
    alternates: { canonical: profilePath(username) },
    openGraph: {
      type: "profile",
      url: profilePath(username),
      title,
      description,
      username,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : undefined,
    },
  };
}

export default function ProfilePage({ params }: PageProps<"/[handle]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Suspense fallback={null}>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}

async function Profile({ params }: { params: PageProps<"/[handle]">["params"] }) {
  const username = parseHandle((await params).handle);
  if (!username) notFound();

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isMe = viewer?.id === profile.id;

  const [followers, following, followState, posts] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    viewer && !isMe
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewer.id)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("posts")
      .select(POST_CARD_SELECT)
      .eq("author_id", profile.id)
      .eq("status", "published")
      .order("published_at", { ascending: false }),
  ]);

  const isFollowing = !!followState.data;

  return (
    <>
      <JsonLd
        data={profilePageLd({
          username: profile.username!,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
        })}
      />
      <section className="flex items-start gap-5 border-b border-black/10 pb-8 dark:border-white/15">
        {profile.avatar_url && (
          <Image
            src={profile.avatar_url}
            alt=""
            width={80}
            height={80}
            className="rounded-full"
          />
        )}
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="text-2xl font-bold">
            {profile.full_name ?? profile.username}
          </h1>
          <p className="text-sm text-zinc-500">@{profile.username}</p>
          {profile.bio && <p>{profile.bio}</p>}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            팔로워 {followers.count ?? 0} · 팔로잉 {following.count ?? 0}
          </p>
        </div>
        {isMe ? (
          <Link
            href="/drafts"
            className="h-9 rounded-full border border-black/15 px-4 text-sm leading-9 dark:border-white/20"
          >
            임시저장 글
          </Link>
        ) : viewer ? (
          <form action={toggleFollow}>
            <input type="hidden" name="targetId" value={profile.id} />
            <button
              type="submit"
              className={`h-9 rounded-full px-5 text-sm font-medium ${
                isFollowing
                  ? "border border-black/15 dark:border-white/20"
                  : "bg-foreground text-background"
              }`}
            >
              {isFollowing ? "팔로잉" : "팔로우"}
            </button>
          </form>
        ) : null}
      </section>

      <section>
        {posts.data?.length ? (
          (posts.data as unknown as PostCardData[]).map((p) => (
            <PostCard key={p.id} post={p} />
          ))
        ) : (
          <p className="py-10 text-center text-zinc-500">
            아직 작성한 글이 없습니다.
          </p>
        )}
      </section>
    </>
  );
}
