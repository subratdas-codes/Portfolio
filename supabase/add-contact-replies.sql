-- ============================================================================
-- contact_replies — conversation thread entries for Admin Portal messages.
-- Run ONCE in the Supabase dashboard SQL Editor.
--
-- Enables: chronological threads (visitor message + admin replies), replies
-- made directly from Gmail that get synced back via /api/sync-email, and
-- realtime updates in the Admin Portal.
-- ============================================================================

create table if not exists public.contact_replies (
  id text primary key default gen_random_uuid()::text,
  message_id text references public.contact_messages(id) on delete cascade,
  sender text not null default 'admin' check (sender in ('admin', 'visitor')),
  body text not null,
  email_message_id text unique,          -- Gmail Message-ID (dedupe on email sync)
  created_at timestamptz default now()
);

create index if not exists idx_contact_replies_message on public.contact_replies(message_id, created_at desc);

-- RLS: admins (authenticated) read, insert, update and delete conversation replies.
-- Visitors never touch this table — replies are created by the Admin Portal or
-- the /api/sync-email serverless function (authenticated admin JWT).
alter table public.contact_replies enable row level security;

create policy "admin read replies"  on public.contact_replies for select to authenticated using (true);
create policy "admin insert replies" on public.contact_replies for insert to authenticated with check (true);
create policy "admin update replies" on public.contact_replies for update to authenticated using (true) with check (true);
create policy "admin delete replies" on public.contact_replies for delete to authenticated using (true);

-- Realtime: broadcast new/updated replies to open Admin Portal tabs instantly.
alter publication supabase_realtime add table public.contact_replies;