import type { Database } from "@/lib/supabase/database.types";

export const POST_CARD_SELECT =
  "id, title, excerpt, cover_image_url, published_at, view_count, like_count, comment_count, status, profiles!posts_author_id_fkey(username, full_name, avatar_url)" as const;

type PostRow = Database["public"]["Tables"]["posts"]["Row"];

export type PostCardData = Pick<
  PostRow,
  | "id"
  | "title"
  | "excerpt"
  | "cover_image_url"
  | "published_at"
  | "view_count"
  | "like_count"
  | "comment_count"
  | "status"
> & {
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};
