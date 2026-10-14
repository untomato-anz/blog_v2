import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { UsernameForm } from "@/components/username-form";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default function WelcomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-8 text-center dark:bg-black">
      <Suspense fallback={null}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  if (user.username) {
    redirect(`/@${user.username}`);
  }

  const suggestion = await suggestUsername(user.email);

  return (
    <>
      {user.avatarUrl && (
        <Image
          src={user.avatarUrl}
          alt=""
          width={80}
          height={80}
          className="rounded-full"
        />
      )}
      <h1 className="text-3xl font-bold tracking-tight">
        가입을 환영합니다, {user.fullName ?? user.email}님!
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        마지막으로, 내 블로그의 아이디를 정해 주세요.
      </p>
      <UsernameForm suggestion={suggestion} />
    </>
  );
}

async function suggestUsername(email: string | undefined) {
  const base =
    (email?.split("@")[0] ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 16)
      .padEnd(3, "0") || "hihere";

  const supabase = await createClient();
  const candidates = [
    base,
    ...Array.from({ length: 5 }, () => `${base}${Math.floor(100 + Math.random() * 900)}`),
  ];
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .in("username", candidates);
  const taken = new Set((data ?? []).map((p) => p.username));
  return candidates.find((c) => !taken.has(c)) ?? `${base}${Date.now() % 100000}`;
}
