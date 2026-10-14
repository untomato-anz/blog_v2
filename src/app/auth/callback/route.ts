import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const NEW_USER_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/";
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { created_at, last_sign_in_at } = data.user;
      const isNewUser =
        !!last_sign_in_at &&
        new Date(last_sign_in_at).getTime() - new Date(created_at).getTime() <
          NEW_USER_WINDOW_MS;
      if (isNewUser) {
        next = "/welcome";
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      if (process.env.NODE_ENV === "development" || !forwardedHost) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
