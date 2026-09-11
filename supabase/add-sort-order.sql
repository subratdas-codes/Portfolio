-- Add sort_order column to every collection table missing it (idempotent).
-- Run once in Supabase SQL Editor.
do $$
declare t text;
begin
  foreach t in array array[
    'skills','projects','certificates','achievements','gallery','testimonials','blogs','coding_profiles'
  ] loop
    execute format(
      'alter table public.%I add column if not exists sort_order int default 0',
      t
    );
  end loop;
end $$;