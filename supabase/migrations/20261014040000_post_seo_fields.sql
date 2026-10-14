alter table public.posts
  add column slug text check (slug is null or (char_length(slug) between 1 and 100 and slug !~ '[/\s?#%]')),
  add column seo_title text check (char_length(seo_title) <= 70),
  add column seo_description text check (char_length(seo_description) <= 200),
  add column summary text check (char_length(summary) <= 500),
  add column tags text[] not null default '{}' check (cardinality(tags) <= 10),
  add column faq jsonb not null default '[]'::jsonb check (jsonb_typeof(faq) = 'array'),
  add column sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  add column cover_image_alt text check (char_length(cover_image_alt) <= 200),
  add column word_count integer not null default 0,
  add column reading_minutes integer not null default 1,
  add column content_updated_at timestamptz not null default now();

update public.posts
set slug = trim(both '-' from left(regexp_replace(lower(coalesce(nullif(title, ''), 'post')), '[\s/?#%]+', '-', 'g'), 80))
           || '-' || left(id::text, 6),
    content_updated_at = updated_at;

create unique index posts_author_slug_key on public.posts (author_id, slug) where slug is not null;
create index posts_tags_idx on public.posts using gin (tags);

grant insert (slug, seo_title, seo_description, summary, tags, faq, sources,
  cover_image_alt, word_count, reading_minutes, content_updated_at)
  on public.posts to authenticated;
grant update (slug, seo_title, seo_description, summary, tags, faq, sources,
  cover_image_alt, word_count, reading_minutes, content_updated_at)
  on public.posts to authenticated;
