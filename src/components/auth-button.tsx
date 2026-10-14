import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getCurrentUser } from "@/lib/auth";

export async function AuthButton() {
  const user = await getCurrentUser();

  if (!user) {
    return <GoogleSignInButton />;
  }

  const profileHref = user.username ? `/@${user.username}` : "/welcome";

  return (
    <div className="flex items-center gap-3">
      {!user.username && (
        <Link
          href="/welcome"
          className="h-9 rounded-full bg-[#FF5C7A] px-4 text-sm font-medium leading-9 text-white"
        >
          아이디 설정하기
        </Link>
      )}
      {user.username && (
        <>
          <Link
            href="/feed"
            className="hidden text-sm text-zinc-700 hover:underline sm:inline dark:text-zinc-300"
          >
            피드
          </Link>
          <Link
            href="/write"
            className="h-9 rounded-full bg-foreground px-4 text-sm font-medium leading-9 text-background"
          >
            글쓰기
          </Link>
        </>
      )}
      <Link href={profileHref} className="flex items-center gap-2">
        {user.avatarUrl && (
          <Image
            src={user.avatarUrl}
            alt=""
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <span className="hidden text-sm text-zinc-700 sm:inline dark:text-zinc-300">
          {user.fullName ?? user.email}
        </span>
      </Link>
      {user.username && (
        <Link
          href="/settings/profile"
          className="hidden text-sm text-zinc-700 hover:underline md:inline dark:text-zinc-300"
        >
          프로필 설정
        </Link>
      )}
      <form action={signOut}>
        <button
          type="submit"
          className="h-9 rounded-full border border-black/[.08] px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}
