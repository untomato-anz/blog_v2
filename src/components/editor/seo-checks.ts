import type { analyzeContent } from "@/lib/blog/content";
import type { PostMeta } from "@/app/actions/posts";

export type Check = {
  id: string;
  label: string;
  hint: string;
  ok: boolean;
  weight: number;
};

export function runSeoChecks(
  title: string,
  meta: PostMeta,
  analysis: ReturnType<typeof analyzeContent>,
  extras: { hasBio: boolean } = { hasBio: true },
): { checks: Check[]; score: number } {
  const metaTitle = meta.seoTitle || title;
  const description = meta.seoDescription || meta.summary;
  const h2Count = analysis.headings.filter((h) => h.level === 2).length;
  const missingAlt = analysis.images.filter((i) => !i.alt.trim()).length;

  const checks: Check[] = [
    {
      id: "title",
      label: "검색 제목 10~60자",
      hint: `현재 ${metaTitle.length}자. 검색 결과에서 잘리지 않는 길이가 좋아요.`,
      ok: metaTitle.length >= 10 && metaTitle.length <= 60,
      weight: 15,
    },
    {
      id: "description",
      label: "검색 설명 50~160자",
      hint: `현재 ${description.length}자. 비워 두면 요약이나 본문 앞부분이 쓰여요.`,
      ok: description.length >= 50 && description.length <= 160,
      weight: 15,
    },
    {
      id: "summary",
      label: "핵심 요약 작성",
      hint: "글 맨 위에 보이는 2~3문장 요약은 AI 답변에 인용되기 쉬워요.",
      ok: meta.summary.trim().length >= 40,
      weight: 15,
    },
    {
      id: "lead",
      label: "첫 문단에 핵심 내용 담기 (40자 이상)",
      hint: "독자가 궁금해할 답을 첫 문단에 먼저 쓰면 AI 답변에 인용되기 쉬워요.",
      ok: (analysis.paragraphs[0]?.length ?? 0) >= 40,
      weight: 10,
    },
    {
      id: "bio",
      label: "작성자 소개 작성",
      hint: "프로필 설정에서 소개를 쓰면 작성자 정보로 신뢰도가 올라가요.",
      ok: extras.hasBio,
      weight: 5,
    },
    {
      id: "length",
      label: "본문 600자 이상",
      hint: `현재 ${analysis.charCount}자. 질문에 충분히 답하는 분량이 좋아요.`,
      ok: analysis.charCount >= 600,
      weight: 10,
    },
    {
      id: "headings",
      label: "소제목(H2) 2개 이상",
      hint: `현재 ${h2Count}개. 소제목은 목차와 검색 결과 이동 링크가 돼요.`,
      ok: h2Count >= 2,
      weight: 10,
    },
    {
      id: "alt",
      label: "모든 이미지에 대체 텍스트",
      hint: missingAlt
        ? `${missingAlt}개 이미지에 설명이 없어요. 아래에서 입력해 주세요.`
        : "이미지 검색과 접근성에 도움이 돼요.",
      ok: missingAlt === 0,
      weight: 10,
    },
    {
      id: "cover",
      label: "대표 이미지",
      hint: "공유 미리보기와 검색 결과 썸네일에 쓰여요.",
      ok: analysis.images.length > 0,
      weight: 10,
    },
    {
      id: "tags",
      label: "태그 1개 이상",
      hint: "같은 주제의 글끼리 연결돼 탐색과 검색 노출에 도움이 돼요.",
      ok: meta.tags.length > 0,
      weight: 5,
    },
    {
      id: "sources",
      label: "출처 또는 참고 링크",
      hint: "근거 링크가 있는 글은 AI 검색에서 더 신뢰받아요.",
      ok: meta.sources.length > 0 || analysis.linkCount > 0,
      weight: 10,
    },
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  return { checks, score: Math.round((got / total) * 100) };
}
