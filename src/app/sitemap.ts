import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/blog/public";
import { absoluteUrl, postPath, profilePath, tagPath } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { posts, profiles } = await getSitemapEntries();

  const tags = new Set<string>();
  const postEntries: MetadataRoute.Sitemap = [];
  for (const p of posts) {
    const username = p.profiles?.username;
    if (!p.slug || !username) continue;
    p.tags?.forEach((t) => tags.add(t));
    postEntries.push({
      url: absoluteUrl(postPath(username, p.slug)),
      lastModified: p.content_updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    ...profiles
      .filter((p) => p.username)
      .map((p) => ({
        url: absoluteUrl(profilePath(p.username!)),
        lastModified: p.updated_at,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ...[...tags].map((t) => ({
      url: absoluteUrl(tagPath(t)),
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
    ...postEntries,
  ];
}
