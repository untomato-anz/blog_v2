import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Bypasses RLS. Use only for trusted server-side work (admin APIs, webhooks, cron).
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is not set");
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
