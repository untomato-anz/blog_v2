import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileForm } from "@/components/profile-form";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "프로필 설정",
  robots: { index: false, follow: false },
};

export default function ProfileSettingsPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
      <h1 className="mb-6 text-2xl font-bold">프로필 설정</h1>
      <Suspense fallback={null}>
        <Form />
      </Suspense>
    </main>
  );
}

async function Form() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, bio")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <ProfileForm
      fullName={data?.full_name ?? user.fullName ?? user.username}
      bio={data?.bio ?? ""}
    />
  );
}
