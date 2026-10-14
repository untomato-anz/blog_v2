"use client";

import { useOptimistic, useTransition } from "react";
import { toggleLike } from "@/app/actions/likes";

type Props = {
  postId: string;
  liked: boolean;
  count: number;
  canLike: boolean;
};

export function LikeButton({ postId, liked, count, canLike }: Props) {
  const [, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic(
    { liked, count },
    (current, next: boolean) => ({
      liked: next,
      count: current.count + (next ? 1 : -1),
    }),
  );

  return (
    <button
      type="button"
      disabled={!canLike}
      title={canLike ? undefined : "로그인 후 이용할 수 있습니다"}
      onClick={() => {
        const next = !state.liked;
        startTransition(async () => {
          setOptimistic(next);
          await toggleLike(postId, next);
        });
      }}
      className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium ${
        state.liked
          ? "border-red-500 text-red-500"
          : "border-black/15 dark:border-white/20"
      } disabled:opacity-60`}
    >
      <span aria-hidden>{state.liked ? "♥" : "♡"}</span>
      좋아요 {state.count}
    </button>
  );
}
