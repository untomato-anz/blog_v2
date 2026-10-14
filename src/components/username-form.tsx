"use client";

import { useActionState } from "react";
import { setUsername } from "@/app/actions/profile";

export function UsernameForm({ suggestion = "" }: { suggestion?: string }) {
  const [state, action, pending] = useActionState(setUsername, undefined);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-3">
      <label className="text-left text-sm font-medium" htmlFor="username">
        블로그 아이디
      </label>
      <div className="flex items-center rounded-lg border border-black/15 px-3 dark:border-white/20">
        <span className="text-zinc-500">@</span>
        <input
          id="username"
          name="username"
          defaultValue={suggestion}
          required
          minLength={3}
          maxLength={20}
          pattern="[a-z0-9_]{3,20}"
          autoComplete="off"
          placeholder="my_blog"
          className="h-11 flex-1 bg-transparent px-2 outline-none"
        />
      </div>
      <p className="text-left text-xs text-zinc-500">
        추천 아이디를 넣어 두었어요. 그대로 시작하거나 원하는 이름으로 바꿔 보세요.
        영문 소문자, 숫자, _ 로 3~20자이며 블로그 주소가 됩니다.
      </p>
      {state?.error && (
        <p className="text-left text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-foreground font-medium text-background disabled:opacity-60"
      >
        {pending ? "저장 중..." : "블로그 시작하기"}
      </button>
    </form>
  );
}
