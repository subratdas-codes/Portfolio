-- Adds the new skill categories' starter values to the live database.
-- Run ONCE in the Supabase dashboard SQL Editor (safe to re-run).
--
-- * Moves Spring Boot from Backend to Framework.
-- * Adds FastAPI under Framework and LLM Basics under Other, but only if a
--   skill with that name is not already present.

update public.skills
set category = 'Framework'
where name = 'Spring Boot';

insert into public.skills (id, name, category, level, icon, color)
select v.id, v.name, v.category, v.level, v.icon, v.color
from (values
  ('id_fastapi0001', 'FastAPI', 'Framework', 82, '⚡', '#009688'),
  ('id_llmbasics01', 'LLM Basics', 'Other', 72, '🤖', '#8b5cf6')
) as v(id, name, category, level, icon, color)
where not exists (select 1 from public.skills s where s.name = v.name);
