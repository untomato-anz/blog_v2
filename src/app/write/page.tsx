import { Suspense } from "react";
import { PostEditor } from "@/components/editor/post-editor";
import { requireUser } from "@/lib/auth";

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
  return <PostEditor userId={user.id} />;
}
