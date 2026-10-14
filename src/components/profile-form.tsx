"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";

export function ProfileForm({
  fullName,
  bio,
}: {
  fullName: string;
  bio: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const input =
    "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none dark:border-white/20";

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        표시 이름
        <input name="fullName" defaultValue={fullName} maxLength={50} required className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        소개
        <textarea
          name="bio"
          defaultValue={bio}
          maxLength={300}
          rows={4}
          placeholder="어떤 동네와 주제의 이야기를 쓰는지 알려 주세요. 검색과 AI 답변에서 작성자 정보로 쓰여요."
          className={input}
        />
        <span className="text-xs font-normal text-zinc-500">
          최대 300자. 글 하단 작성자 박스와 프로필 페이지에 보여요.
        </span>
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-11 self-end rounded-full bg-foreground px-6 font-medium text-background disabled:opacity-60"
      >
        {pending ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
