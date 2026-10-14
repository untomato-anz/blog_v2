"use client";

import { useRef, useTransition } from "react";
import { createComment } from "@/app/actions/comments";

type Props = {
  postId: string;
  parentId?: string;
  placeholder?: string;
  compact?: boolean;
};

export function CommentForm({ postId, parentId, placeholder, compact }: Props) {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={ref}
      action={(formData) =>
        startTransition(async () => {
          await createComment(formData);
          ref.current?.reset();
        })
      }
      className="flex flex-col items-end gap-2"
    >
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea
        name="body"
        required
        maxLength={2000}
        rows={compact ? 2 : 3}
        placeholder={placeholder ?? "댓글을 남겨 보세요"}
        className="w-full resize-none rounded-lg border border-black/15 bg-transparent p-3 text-sm outline-none dark:border-white/20"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-full bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
      >
        {pending ? "등록 중..." : parentId ? "답글 등록" : "댓글 등록"}
      </button>
    </form>
  );
}
