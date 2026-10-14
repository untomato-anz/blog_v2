import type { FaqItem } from "./content";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

type Author = { username: string; full_name: string | null; avatar_url: string | null };

export function personLd(author: Author) {
  return {
    "@type": "Person",
    "@id": `${absoluteUrl(`/@${author.username}`)}#person`,
    name: author.full_name ?? author.username,
    alternateName: `@${author.username}`,
    url: absoluteUrl(`/@${author.username}`),
    ...(author.avatar_url ? { image: author.avatar_url } : {}),
  };
}

export function blogPostingLd(input: {
  url: string;
  headline: string;
  description: string;
  image: string;
  datePublished: string | null;
  dateModified: string;
  author: Author;
  tags: string[];
  wordCount: number;
  commentCount: number;
  likeCount: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${input.url}#article`,
    mainEntityOfPage: input.url,
    url: input.url,
    headline: input.headline,
    description: input.description,
    image: [absoluteUrl(input.image)],
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    dateModified: input.dateModified,
    author: [personLd(input.author)],
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    inLanguage: "ko-KR",
    ...(input.tags.length ? { keywords: input.tags.join(", ") } : {}),
    wordCount: input.wordCount,
    commentCount: input.commentCount,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: input.likeCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: input.commentCount,
      },
    ],
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function collectionPageLd(input: {
  name: string;
  path: string;
  items: { title: string; username: string; slug: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    url: absoluteUrl(input.path),
    inLanguage: "ko-KR",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: input.items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.title,
        url: absoluteUrl(`/@${item.username}/${encodeURIComponent(item.slug)}`),
      })),
    },
  };
}

export function faqLd(faq: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function profilePageLd(author: Author & { bio: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: absoluteUrl(`/@${author.username}`),
    mainEntity: {
      ...personLd(author),
      ...(author.bio ? { description: author.bio } : {}),
    },
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "ko-KR",
  };
}
