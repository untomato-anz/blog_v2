"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

export async function setUsername(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "아이디는 영문 소문자, 숫자, _ 조합 3~20자여야 합니다." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", user.id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "이미 사용 중인 아이디입니다."
          : "아이디를 저장하지 못했습니다. 다시 시도해 주세요.",
    };
  }

  revalidatePath("/", "layout");
  redirect(`/@${username}`);
}
