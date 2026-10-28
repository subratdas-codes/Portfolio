-- Persistent admin highlights on analytics rows.
-- Run ONCE in the Supabase dashboard SQL Editor.
--
-- A highlight is a manual bookmark the admin puts on a visitor / project /
-- resume event (e.g. "this looks like a recruiter — follow up"). It must
-- survive refreshes, browser restarts and other devices, so it is stored in
-- the analytics table instead of only in localStorage.

-- 1. Column -----------------------------------------------------------------
alter table public.analytics
  add column if not exists highlighted boolean not null default false;

-- Older rows may have been created before the default existed.
update public.analytics set highlighted = false where highlighted is null;
alter table public.analytics alter column highlighted set default false;
alter table public.analytics alter column highlighted set not null;

-- 2. Direct update permission (fallback path used by the signed-in admin) ---
drop policy if exists "admin update analytics" on public.analytics;
create policy "admin update analytics"
  on public.analytics for update to authenticated using (true) with check (true);

-- 3. RPC used by the client (works with the anon key as well) ----------------
create or replace function public.set_analytics_highlight(p_id text, p_value boolean default true)
returns void
language sql
security definer
set search_path = public
as $$
  update public.analytics
     set highlighted = coalesce(p_value, true)
   where id = p_id;
$$;

grant execute on function public.set_analytics_highlight(text, boolean) to anon, authenticated;
