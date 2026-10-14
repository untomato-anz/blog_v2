import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Search engines and AI crawlers (OAI-SearchBot, GPTBot, PerplexityBot, ...) are all welcome.
        userAgent: "*",
        allow: "/",
        disallow: ["/write", "/drafts", "/posts/", "/welcome", "/auth/", "/feed", "/settings/", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
