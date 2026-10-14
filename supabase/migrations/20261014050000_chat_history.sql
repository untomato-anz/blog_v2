create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.chat_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  role text not null check (role in ('user','model')),
  content text not null check (char_length(content) <= 4000),
  created_at timestamptz not null default now()
);
create index chat_conversations_user_updated_idx on public.chat_conversations (user_id, updated_at desc);
create index chat_messages_conversation_idx on public.chat_messages (conversation_id, created_at);
create index chat_messages_user_idx on public.chat_messages (user_id);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy chat_conversations_select on public.chat_conversations for select to authenticated using (user_id = (select auth.uid()));
create policy chat_conversations_insert on public.chat_conversations for insert to authenticated with check (user_id = (select auth.uid()));
create policy chat_conversations_update on public.chat_conversations for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy chat_conversations_delete on public.chat_conversations for delete to authenticated using (user_id = (select auth.uid()));

create policy chat_messages_select on public.chat_messages for select to authenticated using (user_id = (select auth.uid()));
create policy chat_messages_insert on public.chat_messages for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.chat_conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
);
create policy chat_messages_delete on public.chat_messages for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.chat_conversations, public.chat_messages from anon;
revoke update on public.chat_conversations from authenticated;
grant update (updated_at) on public.chat_conversations to authenticated;
