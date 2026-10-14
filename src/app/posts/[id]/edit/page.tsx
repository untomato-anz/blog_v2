import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostEditor } from "@/components/editor/post-editor";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, title, content, status")
    .eq("id", id)
    .eq("author_id", user.id)
    .maybeSingle();

  if (!post) notFound();

  return (
    <PostEditor
      userId={user.id}
      postId={post.id}
      initialTitle={post.title}
      initialContent={post.content}
      isPublished={post.status === "published"}
    />
  );
}
