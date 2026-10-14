import Image from "next/image";
import { signOut } from "@/app/auth/actions";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { getCurrentUser } from "@/lib/auth";

export async function AuthButton() {
  const user = await getCurrentUser();

  if (!user) {
    return <GoogleSignInButton />;
  }

  return (
    <div className="flex items-center gap-3">
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
