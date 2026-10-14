"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "model";
  content: string;
  sources?: { source: string; page: number }[];
};

const EXAMPLES = [
  "도둑은 언제 움직이나요?",
  "자원 카드는 어떻게 얻나요?",
  "승리 조건이 뭐예요?",
];

export function CatanChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    const history: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "model", content: "" }]);
    setInput("");
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/catan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "답변을 받지 못했어요.");
      }

      let sources: Message["sources"];
      try {
        sources = JSON.parse(decodeURIComponent(res.headers.get("X-Sources") ?? "[]"));
      } catch {
        sources = [];
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "model", content: answer, sources }]);
      }
    } catch (e) {
      setMessages(history);
      setError(e instanceof Error ? e.message : "답변을 받지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[min(40rem,calc(100dvh-14rem))] flex-col overflow-hidden rounded-2xl border border-black/10 dark:border-white/15">
      <div ref={listRef} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              카탄 규칙집을 바탕으로 답해 드려요. 궁금한 규칙을 물어보세요.
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const mine = m.role === "user";
          const pending = busy && i === messages.length - 1 && !m.content;
          return (
            <div key={i} className={mine ? "flex justify-end" : "flex flex-col items-start gap-1.5"}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                  mine
                    ? "bg-foreground text-background"
                    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                {pending ? "규칙집을 찾아보고 있어요…" : m.content}
              </p>
              {!mine && m.sources && m.sources.length > 0 && m.content && (
                <p className="flex flex-wrap gap-1.5 text-xs text-zinc-500">
                  {m.sources.map((s) => (
                    <span
                      key={`${s.source}-${s.page}`}
                      className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800"
                    >
                      {s.source} {s.page}쪽
                    </span>
                  ))}
                </p>
              )}
            </div>
          );
        })}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-black/10 p-3 dark:border-white/15"
      >
        <textarea
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
          placeholder="카탄 규칙을 물어보세요"
          aria-label="카탄 규칙 질문 입력"
          className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-40"
        >
          전송
        </button>
      </form>
    </div>
  );
}
