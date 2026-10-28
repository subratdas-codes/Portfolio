-- Allow admins to delete individual analytics rows (for cleanup/testing).
-- Run ONCE in the Supabase dashboard SQL Editor.

-- Drop existing policies that might conflict
drop policy if exists "admin delete analytics" on public.analytics;
drop policy if exists "delete analytics" on public.analytics;
drop policy if exists "authenticated delete analytics" on public.analytics;

create policy "admin delete analytics"
  on public.analytics for delete to authenticated using (true);

create policy "anon delete analytics"
  on public.analytics for delete to anon using (true);

-- Helper: delete a single analytics row by id (bypasses RLS)
create or replace function public.delete_analytics(p_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.analytics where id = p_id;
$$;

grant execute on function public.delete_analytics(text) to anon, authenticated;
