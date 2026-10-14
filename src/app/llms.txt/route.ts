import { getFeedPosts } from "@/lib/blog/public";
import { absoluteUrl, postPath, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export async function GET() {
  const posts = await getFeedPosts();

  const lines = posts
    .filter((p) => p.slug && p.profiles?.username)
    .map((p) => {
      const url = absoluteUrl(postPath(p.profiles!.username!, p.slug!));
      const desc = (p.seo_description || p.summary || p.excerpt || "").replace(/\s+/g, " ");
      return `- [${p.title}](${url})${desc ? `: ${desc}` : ""}`;
    });

  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

Member-written posts about local events, pop-ups, exhibitions, festivals and performances. Each post has a summary, sources and author information. The full feed is available at ${absoluteUrl("/rss.xml")} and the sitemap at ${absoluteUrl("/sitemap.xml")}.

## Latest posts

${lines.join("\n") || "- (no posts yet)"}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
