-- ============================================================================
-- Subrat Das Portfolio — Supabase / PostgreSQL Schema
-- Run this in the Supabase SQL editor. Includes tables, foreign keys, indexes,
-- Row Level Security (RLS) policies, and the admin auth gating.
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. profiles (admin identity, linked to auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  role        text,
  tagline     text,
  email       text,
  phone       text,
  location    text,
  photo_url   text,
  availability text default 'available',
  availability_note text,
  typing_roles text[] default '{}',
  years_experience int default 0,
  github_username text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 2. hero
-- ---------------------------------------------------------------------------
create table if not exists public.hero (
  id            uuid primary key default gen_random_uuid(),
  heading       text,
  subheading    text,
  primary_cta_label text,
  primary_cta_href  text,
  secondary_cta_label text,
  secondary_cta_href text,
  show_voice_assistant boolean default true,
  background_effect text default 'particles'
);

-- ---------------------------------------------------------------------------
-- 3. about
-- ---------------------------------------------------------------------------
create table if not exists public.about (
  id        uuid primary key default gen_random_uuid(),
  headline  text,
  paragraphs text[],
  highlights jsonb default '[]',
  facts     jsonb default '[]'
);

-- ---------------------------------------------------------------------------
-- 4. skills
-- ---------------------------------------------------------------------------
create table if not exists public.skills (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  category  text,
  level     int default 0,
  icon      text,
  color     text,
  created_at timestamptz default now()
);
create index if not exists idx_skills_category on public.skills(category);

-- ---------------------------------------------------------------------------
-- 5. education
-- ---------------------------------------------------------------------------
create table if not exists public.education (
  id          uuid primary key default gen_random_uuid(),
  institution text,
  logo_url    text,
  degree      text,
  field       text,
  start_date  text,
  end_date    text,
  cgpa        text,
  description text,
  sort_order  int default 0
);

-- ---------------------------------------------------------------------------
-- 6. experience
-- ---------------------------------------------------------------------------
create table if not exists public.experience (
  id          uuid primary key default gen_random_uuid(),
  company     text,
  logo_url    text,
  role        text,
  type        text,
  start_date  text,
  end_date    text,
  location    text,
  description text,
  achievements text[],
  sort_order  int default 0
);

-- ---------------------------------------------------------------------------
-- 7. projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text unique,
  short_description text,
  detailed_description text,
  image_url     text,
  screenshots   text[],
  demo_video_url text,
  architecture_diagram_url text,
  features      text[],
  challenges    text[],
  learnings     text[],
  technologies  text[],
  github_url    text,
  live_url      text,
  featured      boolean default false,
  views         int default 0,
  created_at    timestamptz default now()
);
create index if not exists idx_projects_featured on public.projects(featured);
create index if not exists idx_projects_slug on public.projects(slug);

-- ---------------------------------------------------------------------------
-- 8. certificates
-- ---------------------------------------------------------------------------
create table if not exists public.certificates (
  id               uuid primary key default gen_random_uuid(),
  name             text,
  organization     text,
  logo_url         text,
  image_url        text,
  credential_id    text,
  issue_date       text,
  verification_url text,
  skills           text[]
);

-- ---------------------------------------------------------------------------
-- 9. achievements
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id           uuid primary key default gen_random_uuid(),
  title        text,
  type         text,
  organization text,
  date         text,
  description  text,
  icon         text
);
create index if not exists idx_achievements_type on public.achievements(type);

-- ---------------------------------------------------------------------------
-- 10. gallery
-- ---------------------------------------------------------------------------
create table if not exists public.gallery (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  image_url   text,
  category    text,
  description text,
  date        text
);
create index if not exists idx_gallery_category on public.gallery(category);

-- ---------------------------------------------------------------------------
-- 11. testimonials
-- ---------------------------------------------------------------------------
create table if not exists public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  role       text,
  company    text,
  avatar_url text,
  quote      text,
  rating     int default 5
);

-- ---------------------------------------------------------------------------
-- 12. blogs
-- ---------------------------------------------------------------------------
create table if not exists public.blogs (
  id           uuid primary key default gen_random_uuid(),
  title        text,
  slug         text unique,
  excerpt      text,
  content      text,
  cover_url    text,
  tags         text[],
  published    boolean default false,
  published_at timestamptz default now(),
  read_time    int default 5
);
create index if not exists idx_blogs_published on public.blogs(published);

-- ---------------------------------------------------------------------------
-- 13. coding_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.coding_profiles (
  id        uuid primary key default gen_random_uuid(),
  platform  text,
  username  text,
  url       text,
  icon      text,
  stats     jsonb default '[]'
);

-- ---------------------------------------------------------------------------
-- 14. social_links
-- ---------------------------------------------------------------------------
create table if not exists public.social_links (
  id        uuid primary key default gen_random_uuid(),
  platform  text,
  url       text,
  icon      text,
  sort_order int default 0
);

-- ---------------------------------------------------------------------------
-- 15. resume
-- ---------------------------------------------------------------------------
create table if not exists public.resume (
  id          uuid primary key default gen_random_uuid(),
  file_name   text,
  file_url    text,
  file_size   text,
  uploaded_at timestamptz default now(),
  downloads   int default 0
);

-- ---------------------------------------------------------------------------
-- 16. contact_messages
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text,
  subject    text,
  message    text,
  read       boolean default false,
  starred    boolean default false,
  reply      text,
  created_at timestamptz default now()
);
create index if not exists idx_messages_read on public.contact_messages(read);
create index if not exists idx_messages_created on public.contact_messages(created_at desc);

-- ---------------------------------------------------------------------------
-- 17. settings
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id                uuid primary key default gen_random_uuid(),
  site_title        text,
  site_description  text,
  primary_color     text default '#6366f1',
  accent_color      text default '#22d3ee',
  font              text default 'Inter',
  seo_title         text,
  seo_description   text,
  seo_keywords      text,
  og_image          text,
  analytics_enabled boolean default true
);

-- ---------------------------------------------------------------------------
-- 18. sections (dynamic page builder config)
-- ---------------------------------------------------------------------------
create table if not exists public.sections (
  id        uuid primary key default gen_random_uuid(),
  key       text unique not null,
  title     text,
  enabled   boolean default true,
  "order"   int default 0,
  built_in  boolean default false
);

-- ---------------------------------------------------------------------------
-- 19. analytics
-- ---------------------------------------------------------------------------
create table if not exists public.analytics (
  id         uuid primary key default gen_random_uuid(),
  type       text,
  referrer   text,
  path       text,
  meta       text,
  created_at timestamptz default now()
);
create index if not exists idx_analytics_type on public.analytics(type);
create index if not exists idx_analytics_created on public.analytics(created_at desc);

-- ---------------------------------------------------------------------------
-- 20. audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  action     text,
  entity     text,
  entity_id  text,
  details    text,
  created_at timestamptz default now()
);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);

-- ===========================================================================
-- ROW LEVEL SECURITY
-- Public can READ all content. Only authenticated admin can INSERT/UPDATE/DELETE.
-- ===========================================================================

alter table public.profiles          enable row level security;
alter table public.hero              enable row level security;
alter table public.about             enable row level security;
alter table public.skills            enable row level security;
alter table public.education         enable row level security;
alter table public.experience        enable row level security;
alter table public.projects          enable row level security;
alter table public.certificates      enable row level security;
alter table public.achievements      enable row level security;
alter table public.gallery           enable row level security;
alter table public.testimonials      enable row level security;
alter table public.blogs             enable row level security;
alter table public.coding_profiles   enable row level security;
alter table public.social_links      enable row level security;
alter table public.resume            enable row level security;
alter table public.settings          enable row level security;
alter table public.sections          enable row level security;
alter table public.analytics         enable row level security;
alter table public.audit_logs        enable row level security;

-- Contact messages: anyone can INSERT (contact form), only admin can SELECT/UPDATE/DELETE
alter table public.contact_messages  enable row level security;

-- Helper: is the current user an admin? (checks auth.users existence = authenticated)
-- In production, restrict by a specific admin email or a role claim.

-- Public read policies
create policy "public read" on public.profiles        for select using (true);
create policy "public read" on public.hero            for select using (true);
create policy "public read" on public.about           for select using (true);
create policy "public read" on public.skills          for select using (true);
create policy "public read" on public.education       for select using (true);
create policy "public read" on public.experience      for select using (true);
create policy "public read" on public.projects        for select using (true);
create policy "public read" on public.certificates    for select using (true);
create policy "public read" on public.achievements    for select using (true);
create policy "public read" on public.gallery         for select using (true);
create policy "public read" on public.testimonials    for select using (true);
create policy "public read" on public.blogs           for select using (true);
create policy "public read" on public.coding_profiles for select using (true);
create policy "public read" on public.social_links    for select using (true);
create policy "public read" on public.resume          for select using (true);
create policy "public read" on public.settings        for select using (true);
create policy "public read" on public.sections        for select using (true);
create policy "public read" on public.analytics       for select using (true);

-- Admin write policies (authenticated users)
create policy "admin write" on public.profiles        for all to authenticated using (true) with check (true);
create policy "admin write" on public.hero            for all to authenticated using (true) with check (true);
create policy "admin write" on public.about           for all to authenticated using (true) with check (true);
create policy "admin write" on public.skills          for all to authenticated using (true) with check (true);
create policy "admin write" on public.education       for all to authenticated using (true) with check (true);
create policy "admin write" on public.experience      for all to authenticated using (true) with check (true);
create policy "admin write" on public.projects        for all to authenticated using (true) with check (true);
create policy "admin write" on public.certificates    for all to authenticated using (true) with check (true);
create policy "admin write" on public.achievements    for all to authenticated using (true) with check (true);
create policy "admin write" on public.gallery         for all to authenticated using (true) with check (true);
create policy "admin write" on public.testimonials    for all to authenticated using (true) with check (true);
create policy "admin write" on public.blogs           for all to authenticated using (true) with check (true);
create policy "admin write" on public.coding_profiles for all to authenticated using (true) with check (true);
create policy "admin write" on public.social_links    for all to authenticated using (true) with check (true);
create policy "admin write" on public.resume          for all to authenticated using (true) with check (true);
create policy "admin write" on public.settings        for all to authenticated using (true) with check (true);
create policy "admin write" on public.sections        for all to authenticated using (true) with check (true);
create policy "admin write" on public.audit_logs      for all to authenticated using (true) with check (true);
create policy "admin write" on public.analytics       for all to authenticated using (true) with check (true);

-- Contact messages: public insert, admin read/update/delete
create policy "public insert messages" on public.contact_messages for insert with check (true);
create policy "admin read messages"    on public.contact_messages for select to authenticated using (true);
create policy "admin write messages"   on public.contact_messages for update to authenticated using (true) with check (true);
create policy "admin delete messages"  on public.contact_messages for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for resume PDF & images (run once)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('portfolio-assets', 'portfolio-assets', true)
  on conflict (id) do nothing;

create policy "public read assets" on storage.objects for select using (bucket_id = 'portfolio-assets');
create policy "admin write assets" on storage.objects for insert to authenticated with check (bucket_id = 'portfolio-assets');
create policy "admin update assets" on storage.objects for update to authenticated using (bucket_id = 'portfolio-assets');
create policy "admin delete assets" on storage.objects for delete to authenticated using (bucket_id = 'portfolio-assets');

-- ---------------------------------------------------------------------------
-- Trigger: updated_at on profiles
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Done. Create an admin user via Supabase Auth (email: admin@subrat.dev).
