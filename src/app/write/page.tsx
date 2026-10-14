import type { Metadata } from "next";
import { Suspense } from "react";
import { PostEditor } from "@/components/editor/post-editor";
import { requireUser } from "@/lib/auth";
import { getEditorContext } from "@/lib/blog/editor-context";

export const metadata: Metadata = {
  title: "새 글 쓰기",
  robots: { index: false, follow: false },
};

export default function WritePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    </main>
  );
}

async function Editor() {
  const user = await requireUser();
  const ctx = await getEditorContext(user.id);
  return (
    <PostEditor
      userId={user.id}
      username={user.username}
      hasBio={ctx.hasBio}
      tagCandidates={ctx.tagCandidates}
    />
  );
}
