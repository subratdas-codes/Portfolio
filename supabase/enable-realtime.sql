-- ============================================================================
-- Enable Supabase Realtime for all content tables.
-- Without this, admin edits/delete DO reach the database but other devices
-- (e.g. the public portfolio tab) never get a live push — they only catch up
-- on the 10-15s poll. Run this once in the Supabase SQL editor.
-- Safe to run repeatedly (skips tables already in the publication).
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'profile', 'hero', 'about', 'skills', 'education', 'experience',
    'projects', 'certificates', 'achievements', 'gallery', 'testimonials',
    'blogs', 'coding_profiles', 'social_links', 'resume', 'settings', 'sections'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
