import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getCurrentUser } from "@/lib/auth";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">blog_v2</span>
        <Suspense fallback={<div className="h-10 w-32" />}>
          <AuthButton />
        </Suspense>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-black sm:text-5xl dark:text-zinc-50">
          생각을 기록하고,
          <br />
          함께 나누는 공간
        </h1>
        <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Google 계정 하나로 바로 가입하고 나만의 글을 써 보세요.
        </p>
        <Suspense fallback={<div className="h-12" />}>
          <HeroCta />
        </Suspense>
      </main>
    </div>
  );
}

async function HeroCta() {
  const user = await getCurrentUser();

  if (user) {
    return (
      <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
        {user.fullName ?? user.email}님, 다시 오신 것을 환영합니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <GoogleSignInButton size="lg" />
      <p className="text-sm text-zinc-500">
        처음이라면 로그인과 동시에 자동으로 회원가입됩니다.
      </p>
    </div>
  );
}
