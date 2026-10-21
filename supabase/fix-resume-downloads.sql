-- FIX: incr_resume_downloads() was defined without a WHERE clause, so the
-- database rejects it with "21000: UPDATE requires a WHERE clause" and resume
-- download counts never increase. This replaces it with a version that targets
-- the current resume row (same pattern as incr_resume_views).
--
-- Run ONCE in the Supabase SQL Editor.

create or replace function public.incr_resume_downloads()
returns void
language sql
security definer
set search_path = public
as $$
  update public.resume
     set downloads = downloads + 1
   where id = (select id from public.resume order by uploaded_at desc nulls last limit 1);
$$;

grant execute on function public.incr_resume_downloads() to anon, authenticated;
