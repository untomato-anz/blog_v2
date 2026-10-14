import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostEditor } from "@/components/editor/post-editor";
import { requireUser } from "@/lib/auth";
import { normalizeTags, parseFaq, parseSources } from "@/lib/blog/content";
import { getEditorContext } from "@/lib/blog/editor-context";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "글 수정",
  robots: { index: false, follow: false },
};

export default function EditPostPage({ params }: PageProps<"/posts/[id]/edit">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Suspense fallback={null}>
        <Editor params={params} />
      </Suspense>
    </main>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/posts/[id]/edit">["params"];
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select(
      "id, title, content, status, slug, seo_title, seo_description, summary, tags, faq, sources, cover_image_url, cover_image_alt",
    )
    .eq("id", id)
    .eq("author_id", user.id)
    .maybeSingle();

  if (!post) notFound();
  const ctx = await getEditorContext(user.id);

  return (
    <PostEditor
      hasBio={ctx.hasBio}
      tagCandidates={ctx.tagCandidates}
      userId={user.id}
      username={user.username}
      postId={post.id}
      initialTitle={post.title}
      initialContent={post.content}
      initialMeta={{
        slug: post.slug ?? "",
        seoTitle: post.seo_title ?? "",
        seoDescription: post.seo_description ?? "",
        summary: post.summary ?? "",
        tags: normalizeTags(post.tags),
        faq: parseFaq(post.faq),
        sources: parseSources(post.sources),
        coverImageUrl: post.cover_image_url,
        coverImageAlt: post.cover_image_alt ?? "",
      }}
      isPublished={post.status === "published"}
    />
  );
}
