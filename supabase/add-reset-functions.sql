-- Reset functions for analytics counters.
-- Run ONCE in Supabase SQL Editor.

-- Reset resume views to 0 + delete recorded resume_view events
CREATE OR REPLACE FUNCTION public.reset_resume_views()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.resume SET views = 0 WHERE id IS NOT NULL;
  DELETE FROM public.analytics WHERE type = 'resume_view';
$$;
GRANT EXECUTE ON FUNCTION public.reset_resume_views() TO authenticated;

-- Reset resume downloads to 0 + delete recorded resume_download events
CREATE OR REPLACE FUNCTION public.reset_resume_downloads()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.resume SET downloads = 0 WHERE id IS NOT NULL;
  DELETE FROM public.analytics WHERE type = 'resume_download';
$$;
GRANT EXECUTE ON FUNCTION public.reset_resume_downloads() TO authenticated;

-- Reset all project views to 0 + delete recorded project_view events
CREATE OR REPLACE FUNCTION public.reset_project_views()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.projects SET views = 0 WHERE id IS NOT NULL;
  DELETE FROM public.analytics WHERE type = 'project_view';
$$;
GRANT EXECUTE ON FUNCTION public.reset_project_views() TO authenticated;

-- Reset page views only (delete page_view events)
CREATE OR REPLACE FUNCTION public.reset_page_views()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.analytics WHERE type = 'page_view';
$$;
GRANT EXECUTE ON FUNCTION public.reset_page_views() TO authenticated;

-- Reset contact requests only (delete contact events)
CREATE OR REPLACE FUNCTION public.reset_contacts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.analytics WHERE type = 'contact';
$$;
GRANT EXECUTE ON FUNCTION public.reset_contacts() TO authenticated;

-- Reset assistant interactions only (delete assistant events)
CREATE OR REPLACE FUNCTION public.reset_assistant()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.analytics WHERE type = 'assistant';
$$;
GRANT EXECUTE ON FUNCTION public.reset_assistant() TO authenticated;

-- Nuclear option: reset everything at once
CREATE OR REPLACE FUNCTION public.reset_all_counters()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.resume SET downloads = 0, views = 0 WHERE id IS NOT NULL;
  UPDATE public.projects SET views = 0 WHERE id IS NOT NULL;
  DELETE FROM public.analytics WHERE id IS NOT NULL;
$$;
GRANT EXECUTE ON FUNCTION public.reset_all_counters() TO authenticated;