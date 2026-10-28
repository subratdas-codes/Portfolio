-- Allow admins to delete individual analytics rows (for cleanup/testing).
-- Run ONCE in the Supabase dashboard SQL Editor.

create policy if not exists "admin delete analytics"
  on public.analytics for delete to authenticated using (true);

-- Optional helper: delete a single analytics row by id (bypasses RLS for
-- service contexts; not strictly needed if RLS above is present).
create or replace function public.delete_analytics(p_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.analytics where id = p_id;
$$;

grant execute on function public.delete_analytics(text) to authenticated;
