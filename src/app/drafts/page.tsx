import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/components/post-card";
import { createClient } from "@/lib/supabase/server";

export default function DraftsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">임시저장 글</h1>
      <Suspense fallback={null}>
        <DraftList />
      </Suspense>
    </main>
  );
}

async function DraftList() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: drafts } = await supabase
    .from("posts")
    .select("id, title, excerpt, updated_at")
    .eq("author_id", user.id)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });

  if (!drafts?.length) {
    return <p className="text-zinc-500">임시저장한 글이 없습니다.</p>;
  }

  return (
    <ul>
      {drafts.map((d) => (
        <li
          key={d.id}
          className="border-b border-black/10 py-4 dark:border-white/15"
        >
          <Link href={`/posts/${d.id}/edit`} className="flex flex-col gap-1">
            <span className="font-semibold">{d.title || "제목 없음"}</span>
            <span className="line-clamp-1 text-sm text-zinc-500">
              {d.excerpt}
            </span>
            <span className="text-xs text-zinc-400">
              {formatDate(d.updated_at)} 수정
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
