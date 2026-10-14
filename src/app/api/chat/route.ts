import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "@/lib/chat/guide";
import { rateLimit } from "@/lib/chat/rate-limit";
import { formatContext, retrieve } from "@/lib/rag/retrieve";
import { isUuid } from "@/lib/blog/content";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_CHAT_MODEL = "gemini-3.5-flash-lite";
const MAX_MESSAGES = 10;
const MAX_CHARS = 500;
const MAX_STORED_MESSAGES = 200;

type ChatMessage = { role: "user" | "model"; content: string };

function json(body: Record<string, unknown>, status: number, headers?: HeadersInit) {
  return Response.json(body, { status, headers });
}

function parseMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const messages: ChatMessage[] = [];
  for (const item of raw.slice(-MAX_MESSAGES)) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "model") || typeof content !== "string") return null;
    const text = content.trim().slice(0, MAX_CHARS);
    if (text) messages.push({ role, content: text });
  }
  // Gemini expects the history to start with a user turn and end with one.
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") return null;
  return messages;
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.gemini_api_key;
  if (!apiKey) {
    return json({ error: "챗봇이 아직 준비되지 않았어요." }, 503);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = rateLimit(userId ? `u:${userId}` : `ip:${ip}`);
  if (!limit.ok) {
    return json({ error: "질문이 너무 많아요. 잠시 후 다시 시도해 주세요." }, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  let body: { messages?: unknown; conversationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "잘못된 요청입니다." }, 400);
  }

  const messages = parseMessages(body.messages);
  if (!messages) {
    return json({ error: "질문을 입력해 주세요." }, 400);
  }
  const question = messages[messages.length - 1].content;

  // Persist the conversation for signed-in users (RLS keeps it private).
  let conversationId: string | null = null;
  if (userId) {
    const requested = typeof body.conversationId === "string" ? body.conversationId : null;
    if (requested) {
      if (!isUuid(requested)) return json({ error: "잘못된 요청입니다." }, 400);
      const { data: existing } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("id", requested)
        .maybeSingle();
      if (!existing) return json({ error: "대화를 찾을 수 없어요." }, 404);
      const { count } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", requested);
      if ((count ?? 0) >= MAX_STORED_MESSAGES) {
        return json({ error: "대화가 너무 길어졌어요. 새 대화를 시작해 주세요." }, 409);
      }
      conversationId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("chat_conversations")
        .insert({})
        .select("id")
        .single();
      if (error || !created) {
        return json({ error: "대화를 저장하지 못했어요." }, 500);
      }
      conversationId = created.id;
    }

    await supabase
      .from("chat_messages")
      .insert({ conversation_id: conversationId!, role: "user", content: question });
  }

  const ai = new GoogleGenAI({ apiKey });
  const encoder = new TextEncoder();

  // RAG: ground the answer in indexed documents when something relevant is found.
  const systemInstruction = SYSTEM_INSTRUCTION + formatContext(await retrieve(question));

  const startStream = () =>
    ai.models.generateContentStream({
      model: process.env.CHAT_MODEL || DEFAULT_CHAT_MODEL,
      contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
      config: {
        systemInstruction,
        temperature: 0.4,
        maxOutputTokens: 800,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });

  let stream: AsyncGenerator<{ text?: string }>;
  try {
    try {
      stream = await startStream();
    } catch {
      // Gemini occasionally answers 503 during demand spikes; retry once.
      await new Promise((r) => setTimeout(r, 1500));
      stream = await startStream();
    }
  } catch (error) {
    console.error("[chat] gemini request failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "지금은 답변하기 어려워요. 잠시 후 다시 시도해 주세요." }, 502);
  }

  const readable = new ReadableStream({
    async start(controller) {
      let answer = "";
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            answer += text;
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (error) {
        console.error("[chat] gemini stream failed", error instanceof Error ? error.message : "unknown");
        if (!answer) {
          controller.enqueue(encoder.encode("지금은 답변하기 어려워요. 잠시 후 다시 시도해 주세요."));
        }
      }

      if (userId && conversationId && answer.trim()) {
        try {
          await supabase.from("chat_messages").insert({
            conversation_id: conversationId,
            role: "model",
            content: answer.trim().slice(0, 4000),
          });
          await supabase
            .from("chat_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        } catch {
          // Saving history is best effort; the answer was already delivered.
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      ...(conversationId ? { "X-Conversation-Id": conversationId } : {}),
    },
  });
}
