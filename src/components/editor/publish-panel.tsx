"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import type { PostMeta } from "@/app/actions/posts";
import { analyzeContent, excerptFrom, slugify, suggestTags } from "@/lib/blog/content";
import { runSeoChecks } from "./seo-checks";

type Props = {
  editor: Editor;
  title: string;
  username: string;
  hasBio: boolean;
  tagCandidates: string[];
  autoFilled: string[];
  meta: PostMeta;
  onChange: (meta: PostMeta) => void;
  onClose: () => void;
  onPublish: () => void;
  pending: boolean;
  isPublished: boolean;
  error: string | null;
};

const SITE_HOST = "blog-v2-eta-neon.vercel.app";

const inputClass =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50";

function Counter({ value, max, ideal }: { value: string; max: number; ideal?: [number, number] }) {
  const n = value.length;
  const good = ideal ? n >= ideal[0] && n <= ideal[1] : n <= max;
  return (
    <span className={`text-xs ${good ? "text-emerald-600" : "text-zinc-400"}`}>
      {n}/{max}
    </span>
  );
}

function Field({
  label,
  hint,
  right,
  children,
}: {
  label: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-sm font-medium">
        {label}
        {right}
      </span>
      {children}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function PublishPanel({
  editor,
  title,
  username,
  hasBio,
  tagCandidates,
  autoFilled,
  meta,
  onChange,
  onClose,
  onPublish,
  pending,
  isPublished,
  error,
}: Props) {
  const [tagDraft, setTagDraft] = useState("");
  const [, rerender] = useState(0);
  const analysis = analyzeContent(editor.getJSON());
  const { checks, score } = runSeoChecks(title, meta, analysis, { hasBio });
  const tagSuggestions = suggestTags(tagCandidates, title, analysis.plain, meta.tags);
  const auto = (key: string) =>
    autoFilled.includes(key) ? (
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
        자동으로 채움
      </span>
    ) : null;
  const set = <K extends keyof PostMeta>(key: K, value: PostMeta[K]) =>
    onChange({ ...meta, [key]: value });

  const slug = slugify(meta.slug || title) || "post";
  const previewTitle = (meta.seoTitle || title || "제목 없음").slice(0, 60);
  const previewDesc = (
    meta.seoDescription ||
    meta.summary ||
    excerptFrom(analysis.plain, 160)
  ).slice(0, 160);
  const cover = meta.coverImageUrl ?? analysis.images[0]?.src ?? null;

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase();
    if (!tag || meta.tags.includes(tag) || meta.tags.length >= 10) return;
    set("tags", [...meta.tags, tag.slice(0, 30)]);
  }

  function setImageAlt(src: string, alt: string) {
    const { tr } = editor.state;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "image" && node.attrs.src === src) {
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, alt });
      }
    });
    editor.view.dispatch(tr);
    rerender((n) => n + 1);
    if (src === cover) set("coverImageAlt", alt);
  }

  const scoreColor =
    score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-500" : "text-red-500";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-background px-6 py-4 dark:border-white/15">
          <div>
            <h2 className="text-lg font-bold">발행 설정</h2>
            <p className="text-xs text-zinc-500">
              검색엔진과 AI가 이 글을 잘 이해하도록 정보를 채워 주세요.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-zinc-500">
            닫기
          </button>
        </header>

        <div className="flex flex-col gap-8 px-6 py-6">
          {/* Score + checklist */}
          <section className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">검색 노출 점검</h3>
              <span className={`text-2xl font-bold ${scoreColor}`}>{score}점</span>
            </div>
            <ul className="flex flex-col gap-2">
              {checks.map((c) => (
                <li key={c.id} className="flex gap-2 text-sm">
                  <span className={c.ok ? "text-emerald-600" : "text-zinc-400"}>
                    {c.ok ? "●" : "○"}
                  </span>
                  <span>
                    <span className={c.ok ? "" : "font-medium"}>{c.label}</span>
                    {!c.ok && <span className="block text-xs text-zinc-500">{c.hint}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Previews */}
          <section className="flex flex-col gap-4">
            <h3 className="font-semibold">미리보기</h3>
            <div className="rounded-xl border border-black/10 p-4 dark:border-white/15">
              <p className="mb-1 text-xs text-zinc-500">Google 검색 결과</p>
              <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                {SITE_HOST} › @{username} › {slug}
              </p>
              <p className="truncate text-lg text-[#1a0dab] dark:text-[#8ab4f8]">
                {previewTitle} | hi here
              </p>
              <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                {previewDesc || "검색 설명이 비어 있어요."}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/15">
              <p className="px-4 pt-3 text-xs text-zinc-500">카카오톡 · SNS 공유</p>
              <div className="mt-2 aspect-[1200/630] w-full bg-zinc-100 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover ?? "/opengraph-image.png"}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="px-4 py-3">
                <p className="truncate font-semibold">{previewTitle}</p>
                <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {previewDesc}
                </p>
                <p className="mt-1 text-xs text-zinc-400">{SITE_HOST}</p>
              </div>
            </div>
          </section>

          {/* GEO fields */}
          <section className="flex flex-col gap-4">
            <h3 className="font-semibold">핵심 내용</h3>
            <Field
              label="핵심 요약"
              hint="글 맨 위에 '요약' 상자로 보여요. 질문에 대한 답을 2~3문장으로 먼저 말해 주세요."
              right={
                <span className="flex items-center gap-2">
                  {auto("summary")}
                  <Counter value={meta.summary} max={500} ideal={[40, 300]} />
                </span>
              }
            >
              <textarea
                value={meta.summary}
                maxLength={500}
                rows={3}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="예) 성수동 팝업 3곳을 직접 다녀온 후기예요. 대기 시간은 평일 오전이 가장 짧았고..."
                className={inputClass}
              />
            </Field>

            <Field label="태그" hint="Enter 또는 쉼표로 추가 (최대 10개)">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/15 px-2 py-2 dark:border-white/20">
                {meta.tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs dark:bg-zinc-800"
                  >
                    #{t}
                    <button
                      type="button"
                      aria-label={`${t} 태그 삭제`}
                      onClick={() => set("tags", meta.tags.filter((x) => x !== t))}
                      className="text-zinc-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag(tagDraft);
                      setTagDraft("");
                    }
                  }}
                  onBlur={() => {
                    addTag(tagDraft);
                    setTagDraft("");
                  }}
                  placeholder={meta.tags.length ? "" : "팝업, 성수, 전시"}
                  className="min-w-24 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              {tagSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-zinc-500">추천:</span>
                  {tagSuggestions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTag(t)}
                      className="rounded-full border border-dashed border-zinc-300 px-2.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      + #{t}
                    </button>
                  ))}
                </div>
              )}
            </Field>

            <div className="flex flex-col gap-2">
              <span className="flex items-center justify-between text-sm font-medium">
                자주 묻는 질문 (선택)
                <button
                  type="button"
                  disabled={meta.faq.length >= 10}
                  onClick={() => set("faq", [...meta.faq, { question: "", answer: "" }])}
                  className="text-xs text-blue-600"
                >
                  + 질문 추가
                </button>
              </span>
              <span className="text-xs text-zinc-500">
                글 하단에 Q&amp;A로 보이고, 검색엔진과 AI가 읽을 수 있는 FAQ 데이터로도 들어가요.
              </span>
              {meta.faq.map((f, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/15">
                  <input
                    value={f.question}
                    maxLength={200}
                    placeholder="질문 (예: 주차 가능한가요?)"
                    onChange={(e) =>
                      set("faq", meta.faq.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))
                    }
                    className={inputClass}
                  />
                  <textarea
                    value={f.answer}
                    maxLength={1000}
                    rows={2}
                    placeholder="답변"
                    onChange={(e) =>
                      set("faq", meta.faq.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))
                    }
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => set("faq", meta.faq.filter((_, j) => j !== i))}
                    className="self-end text-xs text-zinc-500"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <span className="flex items-center justify-between text-sm font-medium">
                출처 · 참고 자료
                <button
                  type="button"
                  disabled={meta.sources.length >= 20}
                  onClick={() => set("sources", [...meta.sources, { title: "", url: "" }])}
                  className="text-xs text-blue-600"
                >
                  + 링크 추가
                </button>
              </span>
              <span className="text-xs text-zinc-500">
                공식 홈페이지, 기사 등 근거 링크를 남기면 신뢰도가 올라가요.
              </span>
              {meta.sources.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={s.title}
                    placeholder="이름 (예: 공식 홈페이지)"
                    onChange={(e) =>
                      set("sources", meta.sources.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                    }
                    className={`${inputClass} w-2/5`}
                  />
                  <input
                    value={s.url}
                    type="url"
                    placeholder="https://"
                    onChange={(e) =>
                      set("sources", meta.sources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                    }
                    className={inputClass}
                  />
                  <button
                    type="button"
                    aria-label="링크 삭제"
                    onClick={() => set("sources", meta.sources.filter((_, j) => j !== i))}
                    className="px-2 text-zinc-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Images */}
          {analysis.images.length > 0 && (
            <section className="flex flex-col gap-3">
              <h3 className="font-semibold">이미지</h3>
              <p className="text-xs text-zinc-500">
                대표 이미지를 고르고, 각 이미지가 무엇인지 짧게 설명해 주세요.
              </p>
              {analysis.images.map((img, i) => (
                <div key={`${img.src}-${i}`} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onChange({ ...meta, coverImageUrl: img.src, coverImageAlt: img.alt })}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                      img.src === cover ? "border-[#FF5C7A]" : "border-transparent"
                    }`}
                    title="대표 이미지로 선택"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt="" className="h-full w-full object-cover" />
                    {img.src === cover && (
                      <span className="absolute inset-x-0 bottom-0 bg-[#FF5C7A] text-[10px] text-white">
                        대표
                      </span>
                    )}
                  </button>
                  <input
                    defaultValue={img.alt}
                    maxLength={200}
                    placeholder={`이미지 설명 (예: ${title || "성수동 팝업스토어 입구"})`}
                    onBlur={(e) => setImageAlt(img.src, e.target.value.trim())}
                    className={inputClass}
                  />
                </div>
              ))}
            </section>
          )}

          {/* Search appearance */}
          <section className="flex flex-col gap-4">
            <h3 className="font-semibold">검색 노출 정보</h3>
            <Field
              label="검색 제목"
              hint="비워 두면 글 제목을 사용해요."
              right={<Counter value={meta.seoTitle} max={70} ideal={[10, 60]} />}
            >
              <input
                value={meta.seoTitle}
                maxLength={70}
                placeholder={title || "검색 결과에 보일 제목"}
                onChange={(e) => set("seoTitle", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="검색 설명"
              hint="비워 두면 핵심 요약 또는 본문 앞부분을 사용해요."
              right={
                <span className="flex items-center gap-2">
                  {auto("seoDescription")}
                  <Counter value={meta.seoDescription} max={200} ideal={[50, 160]} />
                </span>
              }
            >
              <textarea
                value={meta.seoDescription}
                maxLength={200}
                rows={2}
                placeholder={previewDesc || "검색 결과에 보일 설명"}
                onChange={(e) => set("seoDescription", e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() =>
                  set(
                    "seoDescription",
                    (meta.summary || excerptFrom(analysis.plain, 155)).slice(0, 160),
                  )
                }
                className="self-start text-xs text-blue-600"
              >
                요약/본문에서 채우기
              </button>
            </Field>
            <Field
              label="URL 주소"
              hint={isPublished ? "주소를 바꾸면 기존 링크가 깨질 수 있어요." : "비워 두면 제목으로 만들어요."}
              right={auto("slug")}
            >
              <div className="flex items-center rounded-lg border border-black/15 px-3 text-sm dark:border-white/20">
                <span className="shrink-0 text-zinc-400">/@{username}/</span>
                <input
                  value={meta.slug}
                  maxLength={80}
                  placeholder={slugify(title) || "my-post"}
                  onChange={(e) => set("slug", e.target.value)}
                  onBlur={(e) => set("slug", slugify(e.target.value))}
                  className="h-9 flex-1 bg-transparent outline-none"
                />
              </div>
            </Field>
          </section>
        </div>

        <footer className="sticky bottom-0 mt-auto flex items-center justify-between gap-3 border-t border-black/10 bg-background px-6 py-4 dark:border-white/15">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : score < 50 ? (
            <p className="text-sm text-amber-600">
              검색 점수가 낮아요. 위 점검 항목을 채우면 더 잘 노출돼요. 그대로 발행해도 괜찮아요.
            </p>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={pending}
            onClick={onPublish}
            className="h-11 rounded-full bg-foreground px-6 font-medium text-background disabled:opacity-60"
          >
            {pending ? "저장 중..." : isPublished ? "수정 내용 발행" : "발행하기"}
          </button>
        </footer>
      </aside>
    </div>
  );
}
