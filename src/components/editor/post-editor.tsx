"use client";

import { useRef, useState, useTransition } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { savePost, type PostMeta } from "@/app/actions/posts";
import { PublishPanel } from "./publish-panel";
import { autofillMeta } from "@/lib/blog/content";
import { baseExtensions } from "@/lib/blog/extensions";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const EMPTY_META: PostMeta = {
  slug: "",
  seoTitle: "",
  seoDescription: "",
  summary: "",
  tags: [],
  faq: [],
  sources: [],
  coverImageUrl: null,
  coverImageAlt: "",
};

type Props = {
  userId: string;
  username: string;
  hasBio: boolean;
  tagCandidates: string[];
  postId?: string;
  initialTitle?: string;
  initialContent?: Json;
  initialMeta?: Partial<PostMeta>;
  isPublished?: boolean;
};

export function PostEditor({
  userId,
  username,
  hasBio,
  tagCandidates,
  postId,
  initialTitle = "",
  initialContent,
  initialMeta,
  isPublished = false,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [meta, setMeta] = useState<PostMeta>({ ...EMPTY_META, ...initialMeta });
  const [panelOpen, setPanelOpen] = useState(false);
  const [autoFilled, setAutoFilled] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const supabase = useRef(createClient());

  async function uploadImage(file: File): Promise<string | null> {
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("JPG, PNG, WebP, GIF 이미지만 올릴 수 있습니다.");
      return null;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("이미지는 5MB 이하만 올릴 수 있습니다.");
      return null;
    }
    setError(null);
    setUploading(true);
    const ext = file.type.split("/")[1];
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.current.storage
      .from("post-images")
      .upload(path, file, { contentType: file.type });
    setUploading(false);
    if (uploadError) {
      setError("이미지를 업로드하지 못했습니다.");
      return null;
    }
    return supabase.current.storage.from("post-images").getPublicUrl(path).data
      .publicUrl;
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...baseExtensions,
      Placeholder.configure({ placeholder: "이야기를 들려주세요..." }),
    ],
    content: initialContent as never,
    editorProps: {
      attributes: { class: "post-content" },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (!files.length) return false;
        void insertFiles(files);
        return true;
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (!files.length) return false;
        event.preventDefault();
        void insertFiles(files);
        return true;
      },
    },
  });

  async function insertFiles(files: File[]) {
    for (const file of files) {
      const url = await uploadImage(file);
      if (url) editor?.chain().focus().setImage({ src: url }).run();
    }
  }

  function submit(publish: boolean) {
    if (!editor) return;
    setError(null);
    startTransition(async () => {
      const result = await savePost({
        id: postId,
        title,
        content: JSON.stringify(editor.getJSON()),
        meta,
        publish,
      });
      // savePost redirects on success; only errors return.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="제목"
        className="w-full bg-transparent text-4xl font-bold tracking-tight outline-none placeholder:text-zinc-400"
      />
      <details className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        <summary className="cursor-pointer font-medium text-zinc-800 dark:text-zinc-200">
          검색과 AI 답변에 잘 소개되는 글쓰기 팁
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>첫 문단에 독자가 궁금해할 핵심 답을 먼저 적어 주세요.</li>
          <li>H2·H3 소제목으로 내용을 나누면 자동으로 목차가 만들어져요.</li>
          <li>날짜, 가격, 위치, 대기 시간처럼 직접 확인한 구체적인 정보가 인용되기 쉬워요.</li>
          <li>공식 홈페이지나 기사 등 근거 링크를 함께 남겨 주세요.</li>
          <li>이미지에는 무엇을 찍은 사진인지 설명을 달아 주세요(발행 설정에서 입력).</li>
        </ul>
      </details>
      <Toolbar
        editor={editor}
        onPickImage={() => fileInput.current?.click()}
        uploading={uploading}
      />
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        multiple
        hidden
        onChange={(e) => {
          void insertFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <EditorContent editor={editor} />
      {error && !panelOpen && <p className="text-sm text-red-600">{error}</p>}
      {panelOpen && editor && (
        <PublishPanel
          editor={editor}
          title={title}
          username={username}
          hasBio={hasBio}
          tagCandidates={tagCandidates}
          autoFilled={autoFilled}
          meta={meta}
          onChange={setMeta}
          onClose={() => setPanelOpen(false)}
          onPublish={() => submit(true)}
          pending={pending}
          isPublished={isPublished}
          error={error}
        />
      )}
      <div className="flex justify-end gap-3 border-t border-black/10 pt-4 dark:border-white/15">
        {!isPublished && (
          <button
            type="button"
            disabled={pending || uploading}
            onClick={() => submit(false)}
            className="h-10 rounded-full border border-black/15 px-5 text-sm font-medium disabled:opacity-60 dark:border-white/20"
          >
            임시저장
          </button>
        )}
        <button
          type="button"
          disabled={pending || uploading}
          onClick={() => {
            if (!editor) return;
            setError(null);
            // Fill empty SEO fields from the content so the author only has to review them.
            const result = autofillMeta(title, editor.getJSON(), meta);
            setMeta(result.meta);
            setAutoFilled(result.filled);
            setPanelOpen(true);
          }}
          className="h-10 rounded-full bg-foreground px-5 text-sm font-medium text-background disabled:opacity-60"
        >
          {isPublished ? "수정 · 발행 설정" : "발행 설정"}
        </button>
      </div>
    </div>
  );
}

function Toolbar({
  editor,
  onPickImage,
  uploading,
}: {
  editor: Editor | null;
  onPickImage: () => void;
  uploading: boolean;
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      h2: e?.isActive("heading", { level: 2 }) ?? false,
      h3: e?.isActive("heading", { level: 3 }) ?? false,
      bullet: e?.isActive("bulletList") ?? false,
      ordered: e?.isActive("orderedList") ?? false,
      quote: e?.isActive("blockquote") ?? false,
      code: e?.isActive("codeBlock") ?? false,
      link: e?.isActive("link") ?? false,
    }),
  });

  if (!editor || !active) return null;

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 주소", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  const items: { label: string; on: boolean; run: () => void }[] = [
    { label: "H2", on: active.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "H3", on: active.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "B", on: active.bold, run: () => editor.chain().focus().toggleBold().run() },
    { label: "I", on: active.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: "• 목록", on: active.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "1. 목록", on: active.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "인용", on: active.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "코드", on: active.code, run: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: "링크", on: active.link, run: setLink },
  ];

  return (
    <div className="sticky top-0 z-10 flex flex-wrap gap-1 border-y border-black/10 bg-background py-2 dark:border-white/15">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.run}
          className={`h-8 rounded-md px-3 text-sm ${
            item.on
              ? "bg-foreground text-background"
              : "hover:bg-black/[.06] dark:hover:bg-white/10"
          }`}
        >
          {item.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onPickImage}
        disabled={uploading}
        className="h-8 rounded-md px-3 text-sm hover:bg-black/[.06] disabled:opacity-60 dark:hover:bg-white/10"
      >
        {uploading ? "업로드 중..." : "이미지"}
      </button>
    </div>
  );
}
