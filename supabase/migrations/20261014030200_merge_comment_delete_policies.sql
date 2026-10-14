drop policy "Authors delete own comments" on public.comments;
drop policy "Post authors delete comments on their posts" on public.comments;
create policy "Delete own comments or comments on own posts" on public.comments for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid()))
  );
