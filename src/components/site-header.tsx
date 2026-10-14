import Link from "next/link";
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
      <Link
        href="/"
        aria-label="hi here 메인으로"
        className="text-xl font-extrabold tracking-tight"
      >
        hi here<span className="text-[#FF5C7A]">!</span>
      </Link>
      <Suspense fallback={<div className="h-10 w-32" />}>
        <AuthButton />
      </Suspense>
    </header>
  );
}
