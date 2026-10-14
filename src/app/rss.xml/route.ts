import { getFeedPosts } from "@/lib/blog/public";
import { absoluteUrl, postPath, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = await getFeedPosts();

  const items = posts
    .filter((p) => p.slug && p.profiles?.username)
    .map((p) => {
      const url = absoluteUrl(postPath(p.profiles!.username!, p.slug!));
      const description = p.seo_description || p.summary || p.excerpt || "";
      return `<item>
<title>${esc(p.title)}</title>
<link>${esc(url)}</link>
<guid isPermaLink="true">${esc(url)}</guid>
${p.published_at ? `<pubDate>${new Date(p.published_at).toUTCString()}</pubDate>` : ""}
<author>${esc(p.profiles!.full_name ?? p.profiles!.username!)}</author>
<description>${esc(description)}</description>
${(p.tags ?? []).map((t) => `<category>${esc(t)}</category>`).join("")}
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(SITE_NAME)}</title>
<link>${esc(SITE_URL)}</link>
<description>${esc(SITE_DESCRIPTION)}</description>
<language>ko-KR</language>
<atom:link href="${esc(absoluteUrl("/rss.xml"))}" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
