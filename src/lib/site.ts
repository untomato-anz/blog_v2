export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://blog-v2-eta-neon.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "hi here";
export const SITE_TITLE = "hi here — 지금 내 주변에서 뭐 하지?";
export const SITE_DESCRIPTION =
  "팝업부터 전시, 축제, 공연까지. 내 주변에서 열리는 다양한 이벤트를 한눈에 발견하고, 오늘의 새로운 경험을 찾아보세요.";
export const DEFAULT_OG_IMAGE = "/opengraph-image.png";

export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function postPath(username: string, slug: string) {
  return `/@${username}/${encodeURIComponent(slug)}`;
}

export function profilePath(username: string) {
  return `/@${username}`;
}

export function tagPath(tag: string) {
  return `/tags/${encodeURIComponent(tag)}`;
}
