"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type StoredChat = {
  conversationId: string;
  messages: { role: "user" | "model"; content: string }[];
} | null;

export async function getLatestConversation(): Promise<StoredChat> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!conversation) return null;

  const { data: rows } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);

  return {
    conversationId: conversation.id,
    messages: (rows ?? []).map((r) => ({
      role: r.role === "model" ? "model" : "user",
      content: r.content,
    })),
  };
}

export async function deleteConversation(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("chat_conversations").delete().eq("id", id);
  return { ok: !error };
}
