-- profiles extension
alter table public.profiles
  add column username text unique
    check (username ~ '^[a-z0-9_]{3,20}$'),
  add column bio text check (char_length(bio) <= 300);

-- posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  content jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  excerpt text not null default '',
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  view_count integer not null default 0,
  like_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_author_idx on public.posts (author_id, published_at desc);
create index posts_published_idx on public.posts (published_at desc) where status = 'published';

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index follows_following_idx on public.follows (following_id);

create table public.likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index likes_user_idx on public.likes (user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_parent_idx on public.comments (parent_id);
create index comments_author_idx on public.comments (author_id);

create table public.post_views (
  post_id uuid not null references public.posts (id) on delete cascade,
  viewer_key text not null check (char_length(viewer_key) between 8 and 64),
  viewed_on date not null default current_date,
  primary key (post_id, viewer_key, viewed_on)
);

-- triggers
create function private.bump_post_counter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  target uuid := case when tg_op = 'INSERT' then new.post_id else old.post_id end;
begin
  if tg_table_name = 'likes' then
    update public.posts set like_count = greatest(like_count + delta, 0) where id = target;
  elsif tg_table_name = 'comments' then
    update public.posts set comment_count = greatest(comment_count + delta, 0) where id = target;
  elsif tg_table_name = 'post_views' then
    update public.posts set view_count = view_count + delta where id = target;
  end if;
  return null;
end;
$$;
revoke execute on function private.bump_post_counter() from public, anon, authenticated;

create trigger likes_counter after insert or delete on public.likes
  for each row execute function private.bump_post_counter();
create trigger comments_counter after insert or delete on public.comments
  for each row execute function private.bump_post_counter();
create trigger post_views_counter after insert on public.post_views
  for each row execute function private.bump_post_counter();

create function private.check_comment_depth()
returns trigger
language plpgsql
set search_path = ''
as $$
declare p record;
begin
  if new.parent_id is not null then
    select post_id, parent_id into p from public.comments where id = new.parent_id;
    if not found or p.parent_id is not null or p.post_id <> new.post_id then
      raise exception 'Replies are limited to one level';
    end if;
  end if;
  return new;
end;
$$;
create trigger comments_depth before insert on public.comments
  for each row execute function private.check_comment_depth();

create trigger posts_set_updated_at before update on public.posts
  for each row execute function private.set_updated_at();

-- RLS
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.post_views enable row level security;

create policy "Read published or own posts" on public.posts for select
  to anon, authenticated
  using (status = 'published' or author_id = (select auth.uid()));
create policy "Authors insert own posts" on public.posts for insert
  to authenticated with check (author_id = (select auth.uid()));
create policy "Authors update own posts" on public.posts for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));
create policy "Authors delete own posts" on public.posts for delete
  to authenticated using (author_id = (select auth.uid()));

-- counters cannot be written by clients
revoke insert, update on public.posts from anon, authenticated;
grant insert (author_id, title, content, excerpt, cover_image_url, status, published_at)
  on public.posts to authenticated;
grant update (title, content, excerpt, cover_image_url, status, published_at)
  on public.posts to authenticated;

create policy "Follows are public" on public.follows for select
  to anon, authenticated using (true);
create policy "Users follow as themselves" on public.follows for insert
  to authenticated with check (follower_id = (select auth.uid()));
create policy "Users unfollow as themselves" on public.follows for delete
  to authenticated using (follower_id = (select auth.uid()));

create policy "Likes are public" on public.likes for select
  to anon, authenticated using (true);
create policy "Users like as themselves" on public.likes for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "Users unlike as themselves" on public.likes for delete
  to authenticated using (user_id = (select auth.uid()));

create policy "Read comments of visible posts" on public.comments for select
  to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "Users comment as themselves" on public.comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "Authors delete own comments" on public.comments for delete
  to authenticated using (author_id = (select auth.uid()));
create policy "Post authors delete comments on their posts" on public.comments for delete
  to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

create policy "Record views of published posts" on public.post_views for insert
  to anon, authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id and p.status = 'published'));
