-- ============================================================================
-- Run this ONCE in the Supabase SQL Editor if you ran the schema BEFORE this
-- file included the secure counter functions. Adds anonymous-safe counters
-- for project views and resume downloads (used by trackEvent).
-- If the main schema.sql already includes them, skip this file.
-- ============================================================================

create or replace function public.incr_project_views(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.projects set views = views + 1 where slug = p_slug;
$$;

create or replace function public.incr_resume_downloads()
returns void
language sql
security definer
set search_path = public
as $$
  update public.resume set downloads = downloads + 1;
$$;

grant execute on function public.incr_project_views(text) to anon, authenticated;
grant execute on function public.incr_resume_downloads() to anon, authenticated;