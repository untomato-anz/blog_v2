import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const getCurrentUser = cache(async () => {
  // Session verification reads the clock; make sure this only runs at request time.
  await connection();
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, username")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    id: claims.sub,
    email: claims.email as string | undefined,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    username: profile?.username ?? null,
  };
});

/** Requires a signed-in user who has chosen a username. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }
  if (!user.username) {
    redirect("/welcome");
  }
  return { ...user, username: user.username };
}
