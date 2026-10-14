import type { Metadata } from "next";
import { CatanChat } from "@/components/catan/catan-chat";

export const metadata: Metadata = {
  title: "카탄 규칙 문의",
  description: "카탄 규칙집을 바탕으로 궁금한 규칙에 답해 드려요.",
  robots: { index: false, follow: false },
};

export default function CatanPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">카탄 규칙 문의</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          규칙집 PDF를 검색(RAG)해서 근거와 함께 답합니다. 규칙집에 없는 내용은 모른다고 답해요.
        </p>
      </header>
      <CatanChat />
    </main>
  );
}
