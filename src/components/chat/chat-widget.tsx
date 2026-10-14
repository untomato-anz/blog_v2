"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { deleteConversation, getLatestConversation } from "@/app/actions/chat";
import { SUGGESTED_QUESTIONS } from "@/lib/chat/guide";

type Message = { role: "user" | "model"; content: string };

const GREETING =
  "안녕하세요! hi here 이용 방법이 궁금하시면 편하게 물어보세요.";

export function ChatWidget({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load the saved conversation the first time a signed-in user opens the panel.
  useEffect(() => {
    if (!open || !signedIn || loadedRef.current) return;
    loadedRef.current = true;
    getLatestConversation().then((chat) => {
      if (chat) {
        setConversationId(chat.conversationId);
        setMessages((prev) => (prev.length ? prev : chat.messages));
      }
    });
  }, [open, signedIn]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || busy) return;

      const history: Message[] = [...messages, { role: "user", content: question }];
      setMessages([...history, { role: "model", content: "" }]);
      setInput("");
      setError(null);
      setBusy(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, conversationId }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "답변을 받지 못했어요.");
        }

        const id = res.headers.get("X-Conversation-Id");
        if (id) setConversationId(id);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          setMessages([...history, { role: "model", content: answer }]);
        }
      } catch (e) {
        setMessages(history);
        setError(e instanceof Error ? e.message : "답변을 받지 못했어요.");
      } finally {
        setBusy(false);
      }
    },
    [busy, conversationId, messages],
  );

  async function resetChat(removeSaved: boolean) {
    if (busy) return;
    if (removeSaved && conversationId) {
      await deleteConversation(conversationId);
    }
    setConversationId(null);
    setMessages([]);
    setError(null);
  }

  // The Catan rules page has its own dedicated chat.
  if (pathname.startsWith("/catan")) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 print:hidden">
      {open && (
        <section
          role="dialog"
          aria-label="hi here 도우미 챗봇"
          className="flex h-[min(32rem,calc(100dvh-6rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-background shadow-xl dark:border-white/15"
        >
          <header className="flex items-center justify-between gap-2 border-b border-black/10 px-4 py-3 dark:border-white/15">
            <h2 className="text-sm font-bold">hi here 도우미</h2>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => resetChat(false)}
                  disabled={busy}
                  className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                >
                  새 대화
                </button>
              )}
              {signedIn && conversationId && (
                <button
                  type="button"
                  onClick={() => resetChat(true)}
                  disabled={busy}
                  className="rounded px-2 py-1 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                >
                  대화 삭제
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="챗봇 닫기"
                className="rounded px-2 py-1 text-base leading-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                ×
              </button>
            </div>
          </header>

          <div
            ref={listRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 text-sm"
            aria-live="polite"
          >
            <Bubble role="model" content={GREETING} />
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-full bg-zinc-100 px-3 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <Bubble
                key={i}
                role={m.role}
                content={m.content}
                pending={busy && i === messages.length - 1 && !m.content}
              />
            ))}
            {error && (
              <p role="alert" className="text-xs text-red-600">
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-black/10 p-3 dark:border-white/15"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                maxLength={500}
                placeholder="궁금한 점을 물어보세요"
                aria-label="질문 입력"
                className="max-h-24 min-h-9 flex-1 resize-none rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="h-9 rounded-lg bg-foreground px-3 text-sm font-medium text-background disabled:opacity-40"
              >
                전송
              </button>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              {signedIn
                ? "로그인하면 대화가 저장됩니다."
                : "로그인하면 대화가 저장됩니다. 지금은 저장되지 않아요."}
            </p>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "챗봇 닫기" : "도움말 챗봇 열기"}
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-xl text-background shadow-lg"
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}

function Bubble({
  role,
  content,
  pending,
}: {
  role: Message["role"];
  content: string;
  pending?: boolean;
}) {
  const mine = role === "user";
  return (
    <div className={mine ? "flex justify-end" : "flex justify-start"}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-6 ${
          mine
            ? "bg-foreground text-background"
            : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        }`}
      >
        {pending ? "답변을 만들고 있어요…" : content}
      </p>
    </div>
  );
}
