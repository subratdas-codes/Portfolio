-- Adds a resume_views counter to the resume table + a secure RPC to increment it.
-- Run this ONCE in Supabase SQL Editor.

ALTER TABLE public.resume ADD COLUMN IF NOT EXISTS views int DEFAULT 0;

CREATE OR REPLACE FUNCTION public.incr_resume_views()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.resume SET views = views + 1;
$$;

GRANT EXECUTE ON FUNCTION public.incr_resume_views() TO anon, authenticated;
