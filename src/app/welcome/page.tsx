import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";

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
        Google 계정으로 회원가입이 완료되었습니다.
      </p>
      <Link
        href="/"
        className="flex h-11 items-center rounded-full bg-foreground px-6 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        시작하기
      </Link>
    </>
  );
}
