-- ============================================================================
-- Subrat Das Portfolio — Supabase / PostgreSQL Schema (production)
-- Run ONCE in the Supabase dashboard SQL Editor.
-- Creates 20 tables, Row Level Security, Realtime, Storage bucket and the
-- secure counter functions used for project views / resume downloads.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. profile (admin identity, linked to Supabase Auth user_id)
-- ---------------------------------------------------------------------------
create table if not exists public.profile (
  id text primary key default gen_random_uuid()::text,
  user_id text,
  name text not null,
  role text,
  tagline text,
  email text,
  phone text,
  location text,
  photo_url text,
  availability text default 'available',
  availability_note text,
  typing_roles text[] default '{}',
  years_experience int default 0,
  github_username text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 2. hero
-- ---------------------------------------------------------------------------
create table if not exists public.hero (
  id text primary key default gen_random_uuid()::text,
  heading text,
  subheading text,
  primary_cta_label text,
  primary_cta_href text,
  secondary_cta_label text,
  secondary_cta_href text,
  show_voice_assistant boolean default true,
  background_effect text default 'particles'
);

-- ---------------------------------------------------------------------------
-- 3. about
-- ---------------------------------------------------------------------------
create table if not exists public.about (
  id text primary key default gen_random_uuid()::text,
  headline text,
  paragraphs text[],
  highlights jsonb default '[]',
  facts jsonb default '[]'
);

-- ---------------------------------------------------------------------------
-- 4. skills
-- ---------------------------------------------------------------------------
create table if not exists public.skills (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category text,
  level int default 0,
  icon text,
  color text,
  created_at timestamptz default now()
);
create index if not exists idx_skills_category on public.skills(category);

-- ---------------------------------------------------------------------------
-- 5. education
-- ---------------------------------------------------------------------------
create table if not exists public.education (
  id text primary key default gen_random_uuid()::text,
  institution text,
  logo_url text,
  degree text,
  field text,
  start_date text,
  end_date text,
  cgpa text,
  description text,
  sort_order int default 0
);

-- ---------------------------------------------------------------------------
-- 6. experience
-- ---------------------------------------------------------------------------
create table if not exists public.experience (
  id text primary key default gen_random_uuid()::text,
  company text,
  logo_url text,
  role text,
  type text,
  start_date text,
  end_date text,
  location text,
  description text,
  achievements text[],
  sort_order int default 0
);

-- ---------------------------------------------------------------------------
-- 7. projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  slug text unique,
  short_description text,
  detailed_description text,
  image_url text,
  screenshots text[],
  demo_video_url text,
  architecture_diagram_url text,
  features text[],
  challenges text[],
  learnings text[],
  technologies text[],
  github_url text,
  live_url text,
  featured boolean default false,
  views int default 0,
  created_at timestamptz default now()
);
create index if not exists idx_projects_featured on public.projects(featured);
create index if not exists idx_projects_slug on public.projects(slug);

-- ---------------------------------------------------------------------------
-- 8. certificates
-- ---------------------------------------------------------------------------
create table if not exists public.certificates (
  id text primary key default gen_random_uuid()::text,
  name text,
  organization text,
  logo_url text,
  image_url text,
  credential_id text,
  issue_date text,
  verification_url text,
  skills text[]
);

-- ---------------------------------------------------------------------------
-- 9. achievements
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id text primary key default gen_random_uuid()::text,
  title text,
  type text,
  organization text,
  date text,
  description text,
  icon text
);
create index if not exists idx_achievements_type on public.achievements(type);

-- ---------------------------------------------------------------------------
-- 10. gallery
-- ---------------------------------------------------------------------------
create table if not exists public.gallery (
  id text primary key default gen_random_uuid()::text,
  title text,
  image_url text,
  category text,
  description text,
  date text
);
create index if not exists idx_gallery_category on public.gallery(category);

-- ---------------------------------------------------------------------------
-- 11. testimonials
-- ---------------------------------------------------------------------------
create table if not exists public.testimonials (
  id text primary key default gen_random_uuid()::text,
  name text,
  role text,
  company text,
  avatar_url text,
  quote text,
  rating int default 5
);

-- ---------------------------------------------------------------------------
-- 12. blogs
-- ---------------------------------------------------------------------------
create table if not exists public.blogs (
  id text primary key default gen_random_uuid()::text,
  title text,
  slug text unique,
  excerpt text,
  content text,
  cover_url text,
  tags text[],
  published boolean default false,
  published_at timestamptz default now(),
  read_time int default 5
);
create index if not exists idx_blogs_published on public.blogs(published);

-- ---------------------------------------------------------------------------
-- 13. coding_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.coding_profiles (
  id text primary key default gen_random_uuid()::text,
  platform text,
  username text,
  url text,
  icon text,
  stats jsonb default '[]'
);

-- ---------------------------------------------------------------------------
-- 14. social_links
-- ---------------------------------------------------------------------------
create table if not exists public.social_links (
  id text primary key default gen_random_uuid()::text,
  platform text,
  url text,
  icon text,
  sort_order int default 0
);

-- ---------------------------------------------------------------------------
-- 15. resume
-- ---------------------------------------------------------------------------
create table if not exists public.resume (
  id text primary key default gen_random_uuid()::text,
  file_name text,
  file_url text,
  file_size text,
  uploaded_at timestamptz default now(),
  downloads int default 0
);

-- ---------------------------------------------------------------------------
-- 16. contact_messages
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id text primary key default gen_random_uuid()::text,
  name text,
  email text,
  subject text,
  message text,
  read boolean default false,
  starred boolean default false,
  reply text,
  created_at timestamptz default now()
);
create index if not exists idx_messages_read on public.contact_messages(read);
create index if not exists idx_messages_created on public.contact_messages(created_at desc);

-- ---------------------------------------------------------------------------
-- 17. settings
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id text primary key default gen_random_uuid()::text,
  site_title text,
  site_description text,
  primary_color text default '#6366f1',
  accent_color text default '#22d3ee',
  font text default 'Inter',
  seo_title text,
  seo_description text,
  seo_keywords text,
  og_image text,
  analytics_enabled boolean default true
);

-- ---------------------------------------------------------------------------
-- 18. sections (page builder config)
-- ---------------------------------------------------------------------------
create table if not exists public.sections (
  id text primary key default gen_random_uuid()::text,
  key text unique not null,
  title text,
  enabled boolean default true,
  "order" int default 0,
  built_in boolean default false
);

-- ---------------------------------------------------------------------------
-- 19. analytics
-- ---------------------------------------------------------------------------
create table if not exists public.analytics (
  id text primary key default gen_random_uuid()::text,
  type text,
  referrer text,
  path text,
  meta text,
  created_at timestamptz default now()
);
create index if not exists idx_analytics_type on public.analytics(type);
create index if not exists idx_analytics_created on public.analytics(created_at desc);

-- ---------------------------------------------------------------------------
-- 20. audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id text primary key default gen_random_uuid()::text,
  action text,
  entity text,
  entity_id text,
  details text,
  created_at timestamptz default now()
);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);

-- ===========================================================================
-- SECURE COUNTER FUNCTIONS (anon visitors can increment counts via RPC
-- without being able to edit rows directly)
-- ===========================================================================
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

-- ===========================================================================
-- ROW LEVEL SECURITY
-- Public can READ all content. Only authenticated admin can write.
-- ===========================================================================

alter table public.profile          enable row level security;
alter table public.hero             enable row level security;
alter table public.about            enable row level security;
alter table public.skills           enable row level security;
alter table public.education        enable row level security;
alter table public.experience       enable row level security;
alter table public.projects         enable row level security;
alter table public.certificates     enable row level security;
alter table public.achievements     enable row level security;
alter table public.gallery          enable row level security;
alter table public.testimonials     enable row level security;
alter table public.blogs            enable row level security;
alter table public.coding_profiles  enable row level security;
alter table public.social_links     enable row level security;
alter table public.resume           enable row level security;
alter table public.settings         enable row level security;
alter table public.sections         enable row level security;
alter table public.analytics        enable row level security;
alter table public.audit_logs       enable row level security;
alter table public.contact_messages enable row level security;

-- Public read policies
create policy "public read profile"         on public.profile          for select using (true);
create policy "public read hero"            on public.hero             for select using (true);
create policy "public read about"           on public.about            for select using (true);
create policy "public read skills"          on public.skills           for select using (true);
create policy "public read education"       on public.education        for select using (true);
create policy "public read experience"      on public.experience       for select using (true);
create policy "public read projects"        on public.projects         for select using (true);
create policy "public read certificates"    on public.certificates     for select using (true);
create policy "public read achievements"    on public.achievements     for select using (true);
create policy "public read gallery"         on public.gallery          for select using (true);
create policy "public read testimonials"    on public.testimonials     for select using (true);
create policy "public read blogs"           on public.blogs            for select using (true);
create policy "public read coding_profiles" on public.coding_profiles  for select using (true);
create policy "public read social_links"    on public.social_links     for select using (true);
create policy "public read resume"          on public.resume           for select using (true);
create policy "public read settings"        on public.settings         for select using (true);
create policy "public read sections"        on public.sections         for select using (true);

-- Admin write policies (authenticated users)
create policy "admin write profile"         on public.profile          for all to authenticated using (true) with check (true);
create policy "admin write hero"            on public.hero             for all to authenticated using (true) with check (true);
create policy "admin write about"           on public.about            for all to authenticated using (true) with check (true);
create policy "admin write skills"          on public.skills           for all to authenticated using (true) with check (true);
create policy "admin write education"       on public.education        for all to authenticated using (true) with check (true);
create policy "admin write experience"      on public.experience       for all to authenticated using (true) with check (true);
create policy "admin write projects"        on public.projects         for all to authenticated using (true) with check (true);
create policy "admin write certificates"    on public.certificates     for all to authenticated using (true) with check (true);
create policy "admin write achievements"    on public.achievements     for all to authenticated using (true) with check (true);
create policy "admin write gallery"         on public.gallery          for all to authenticated using (true) with check (true);
create policy "admin write testimonials"    on public.testimonials     for all to authenticated using (true) with check (true);
create policy "admin write blogs"           on public.blogs            for all to authenticated using (true) with check (true);
create policy "admin write coding_profiles" on public.coding_profiles  for all to authenticated using (true) with check (true);
create policy "admin write social_links"    on public.social_links     for all to authenticated using (true) with check (true);
create policy "admin write resume"          on public.resume           for all to authenticated using (true) with check (true);
create policy "admin write settings"        on public.settings         for all to authenticated using (true) with check (true);
create policy "admin write sections"        on public.sections         for all to authenticated using (true) with check (true);
create policy "admin write audit_logs"      on public.audit_logs       for all to authenticated using (true) with check (true);

-- Contact messages: public insert (contact form), admin read/update/delete
create policy "public insert messages"  on public.contact_messages for insert with check (true);
create policy "admin read messages"     on public.contact_messages for select to authenticated using (true);
create policy "admin write messages"    on public.contact_messages for update to authenticated using (true) with check (true);
create policy "admin delete messages"   on public.contact_messages for delete to authenticated using (true);

-- Analytics: visitors can RECORD events, only admin can view
create policy "public insert analytics"        on public.analytics for insert to anon with check (true);
create policy "public insert analytics authed"  on public.analytics for insert to authenticated with check (true);
create policy "admin read analytics"            on public.analytics for select to authenticated using (true);

-- ===========================================================================
-- REALTIME — broadcast every table's changes to open visitors
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profile','hero','about','skills','education','experience','projects',
    'certificates','achievements','gallery','testimonials','blogs',
    'coding_profiles','social_links','resume','settings','sections',
    'analytics','audit_logs','contact_messages'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ===========================================================================
-- STORAGE — portfolio-assets bucket (permanent images / resume)
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('portfolio-assets', 'portfolio-assets', true)
on conflict (id) do nothing;

create policy "public read assets" on storage.objects
  for select using (bucket_id = 'portfolio-assets');
create policy "admin write assets" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolio-assets');
create policy "admin update assets" on storage.objects
  for update to authenticated using (bucket_id = 'portfolio-assets');
create policy "admin delete assets" on storage.objects
  for delete to authenticated using (bucket_id = 'portfolio-assets');

-- ===========================================================================
-- updated_at trigger on profile
-- ===========================================================================
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_profile_updated on public.profile;
create trigger trg_profile_updated before update on public.profile
  for each row execute function public.set_updated_at();

-- Done. Create the admin user via Supabase Auth (email: subratdas219@gmail.com).
-- NOTE: if you already ran an earlier version of this schema, run ONLY this
-- small snippet in the SQL editor to add the counter functions:
--
--   create or replace function public.incr_project_views(p_slug text)
--   returns void language sql security definer set search_path = public as $$
--     update public.projects set views = views + 1 where slug = p_slug; $$;
--   create or replace function public.incr_resume_downloads()
--   returns void language sql security definer set search_path = public as $$
--     update public.resume set downloads = downloads + 1; $$;
--   grant execute on function public.incr_project_views(text) to anon, authenticated;
--   grant execute on function public.incr_resume_downloads() to anon, authenticated;