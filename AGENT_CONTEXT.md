# AGENT_CONTEXT.md — Subrat Das Portfolio

Snapshot for a fresh agent to pick up work exactly where it left off. Git is clean on branch, last commit `61244a8` (2026).

---

## 1. Project Overview

Personal portfolio + CMS site for **Subrat Das** (MCA @ KIIT University, full-stack developer, Bhubaneswar). React SPA with an authenticated **Admin CMS** that edits every piece of content, plus a Supabase backend that syncs all data to the cloud so edits are permanent and shared across devices.

Key pages/sections: Hero (typing effect + optional voice assistant), About, Skills, Education, Experience, Projects, Certificates, Achievements, Gallery, Testimonials, Blog, Coding Profiles, Resume, Contact, Admin Portal (`/admin`).

**Architecture:** localStorage-first with Supabase as source of truth. On load, read localStorage cache instantly → background sync from Supabase → every write goes to localStorage immediately + pushes to Supabase → Supabase Realtime broadcasts changes to all open viewer tabs.

---

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion 12, lucide-react icons |
| Forms/validation | react-hook-form, zod, @hookform/resolvers |
| Routing | react-router-dom v7 |
| Backend / data | Supabase (`@supabase/supabase-js` v2) + custom store (`src/lib/store.ts`) + localStorage cache |
| Serverless (Vercel) | Node functions in `/api` — `imapflow`, `mailparser`, `nodemailer` |
| Email | Gmail SMTP (465) via nodemailer; IMAP (993) sync via imapflow |
| Deploy | Vercel (rewrites in `vercel.json`), Supabase project |

**Storage keys (localStorage):** `subrat_portfolio_db_v9` (DB), `subrat_portfolio_session_v1` (auth), `subrat_portfolio_draft_v1`, `subrat_portfolio_supabase_seeded_v1` (seed flag), `subrat_portfolio_order_v1` (client-side order map).

---

## 3. Tables (21 total)

Schema in `supabase/schema.sql` (creates 20). `contact_replies` added separately in `supabase/add-contact-replies.sql`. All content tables are editable from Admin CMS.

### Public-readable tables (17) — anon `select` allowed; authenticated write
1. **profile** — singleton; admin identity, name, title, availability, typing_roles (array), photo, GitHub username. Has `updated_at` trigger.
2. **hero** — singleton; heading, CTAs, show_voice_assistant, background_effect.
3. **about** — singleton; headline, paragraphs (array), highlights/facts (jsonb).
4. **skills** — name, category, level (0-100), icon, color.
5. **education** — institution, degree, dates, cgpa, logo, `sort_order`.
6. **experience** — company, role, type, dates, achievements (array), `sort_order`.
7. **projects** — full project card: slug (unique), images, features/challenges/learnings/technologies (arrays), github/live URLs, `featured`, `views`.
8. **certificates** — name, org, image, credential_id, verification_url, skills.
9. **achievements** — type (Award/Hackathon/etc.), org, date, icon.
10. **gallery** — category, image, description, date.
11. **testimonials** — name, role, company, avatar, quote, rating.
12. **blogs** — slug (unique), content, tags, published, published_at, read_time.
13. **coding_profiles** — LeetCode/GitHub/etc., username, url, stats (jsonb).
14. **social_links** — platform, url, icon, `sort_order`.
15. **resume** — singleton; file_name/url/size, uploaded_at, `downloads`, `views`.
16. **settings** — singleton; site title/desc, colors, font, SEO fields, analytics_enabled.
17. **sections** — page-builder rows: `key` (unique), title, enabled, `order` (column literally named `"order"`), built_in.

### Private tables (4) — authenticated only
18. **analytics** — event logs: type (page_view/project_view/resume_download/resume_view/contact/assistant/click), referrer, path, meta, created_at. **Public insert allowed** (anon + authed) so visitors can log events; only admin reads.
19. **audit_logs** — admin CRUD audit trail (action, entity, entity_id, details).
20. **contact_messages** — contact form rows: name, email, subject, message, read, starred, reply, created_at. Public insert (form), admin read/update/delete.
21. **contact_replies** — thread entries: `message_id` FK → contact_messages (cascade delete), sender (`admin`/`visitor`), body, `email_message_id` (unique, Gmail dedupe), created_at. Admin only (via Portal or `sync-email`).

**RLS model:** every table has RLS enabled. Public read policies for the 17, "admin write → authenticated" for the 17 + audit_logs. Contact/analytics have public-insert policies. `contact_replies` is admin-only.

### Storage
- Public bucket **`portfolio-assets`** (images / resume), public read + authenticated write/update/delete.

### Secure RPC functions (anon-safe counters & admin resets)
- `incr_project_views(p_slug text)` — anon ✓
- `incr_resume_downloads()` — anon ✓
- `incr_resume_views()` — anon ✓
- `contact_thread_email(p_thread_id)` — anon ✓ (JWT-independent reply authorization helper)
- `set_updated_at()` — trigger fn (profile)
- `reset_resume_views / reset_resume_downloads / reset_project_views / reset_page_views / reset_contacts / reset_assistant / reset_all_counters` — authenticated ✓

---

## 4. API Endpoints (Vercel serverless, in `/api/`)

### `POST /api/send-email`
Sends email via Gmail SMTP (nodemailer, port 465). Body: `{ to, subject, html, fromName?, replyTo?, threadId? }`.
- **Authz gate:** anonymous calls may only send **to the owner** (GMAIL_USER). Admin replies send `Authorization: Bearer <supabase JWT>` (token verified server-side to belong to admin email), OR pass `threadId` + visitor email → verified via `contact_thread_email()` RPC (fallback if session lapsed).
- Builds custom `Message-ID: <portfolio-<threadId>-<ts>@subratdas.vercel.app>` for header-based threading. GET → 405 instantly (lazy imports). `maxDuration: 10`.

### `POST`/`GET /api/sync-email`
Scans Gmail (INBOX = visitor replies, Sent Mail = admin replies, last 90 days) via imapflow + mailparser, extracts conversation id from subject token `[Portfolio #<id>]` (legacy) or Message-ID/References headers (current), and upserts `contact_replies` rows, deduped by `email_message_id`. Guarded by admin JWT. `maxDuration: 20`.

No other API routes exist. There is currently **no `/api/reset`** wrapper — resets are done via direct `supabase.rpc()` calls from the client (admin-authenticated).

---

## 5. Current Bugs / Issues Being Worked On

1. **Contact email threading (most recent work):** Subject now clean (no `[Portfolio #id]` token) — threading relies on Message-ID/References headers. `sync-email` already resolves via headers, but **legacy emails with the subject token still get matched by `TOKEN_RE`** (kept intentionally). Verify real Gmail threads show up as one conversation in the Admin Portal.
2. **`pushTable` reorder path** (`store.ts:~215`) writes `supabase.from(t).update({ order: row.order })` — works only for `sections` (which has the `"order"` column). The alternate `setCollectionOrder()` writes `sort_order` best-effort. If a non-sections table ever gets `reorder()` called from UI it will fail silently per-table.
3. **SQL files marked "run once"** — must confirm which have actually been applied to the live Supabase project (see §6) — especially `add-contact-replies.sql`, otherwise the `contact_replies` table and realtime subscription don't exist.
4. **Client order map vs cloud sort_order:** local `subrat_portfolio_order_v1` keeps order stable across syncs; cloud `sort_order` columns partially exist — `add-sort-order.sql` adds them to skills/projects/certificates/achievements/gallery/testimonials/blogs/coding_profiles. `education`/`experience`/`social_links` already have `sort_order` in `schema.sql`.
5. **Analytics counts vs event logs:** counters live on projects (`views`) and resume (`downloads`, `views`) via RPC, and event rows in `analytics`. The `reset_*` RPCs clear the event rows and zero the counters.

---

## 6. SQL Files (in `supabase/`) — apply order & status

Files are idempotent/`IF NOT EXISTS` guarded. **Confirm each against the live project before assuming it's applied.** Recommended order:

1. `schema.sql` — main: 20 tables + RLS + realtime + bucket + counter functions + profile trigger. **Must run first.**
2. `add-contact-replies.sql` — creates `contact_replies` (21st table) + admin RLS + realtime. Running this in the dashboard SQL editor requires superuser/RPC (dashboard editor is fine).
3. `add-reply-verify.sql` — `contact_thread_email()` RPC (needed for JWT-independent admin replies). **Must run if send-email auth fallback is used.**
4. `add-resume-views.sql` — `resume.views` column + `incr_resume_views()` RPC.
5. `add-sort-order.sql` — adds `sort_order` to the 8 collection tables that lack it.
6. `add-reset-functions.sql` — admin reset RPCs (resume/project/analytics counters).
7. `add-counter-functions.sql` — **legacy, only if you ran schema.sql before it gained counter functions**; otherwise skip (already in schema.sql).

**Important note:** `seed.ts` lives at `src/lib/seed.ts`, not `supabase/` (the requested path in prior context was wrong). Seeding to the cloud happens automatically from the client: on first admin sign-in with an empty `profile` table, `syncFromCloud()` pushes the seed data (`store.ts` `SEEDED_KEY` flag). No manual SQL insert needed.

---

## 7. Environment Variables & Current State

### Client (`src/lib/supabase.ts` reads Vite env, prefix `VITE_`)
From `D:\ownsite\Portfolio\.env.local` (verify git-ignored before committing):
- `VITE_SUPABASE_URL=https://anoquulghqraxrvnmvts.supabase.co` ✓ set
- `VITE_SUPABASE_ANON_KEY=sb_publishable_bDTGVHiNPhCUfhhF2yAoaA_A3DhdNtj` ✓ set (legacy `sb_publishable_` style — new publishable key format)

If unset, app runs in **local-only mode** (`supabase` = null, `isSupabaseConfigured` = false); admin sign-in returns "Backend not configured".

### Server (Vercel project env — `process.env` in `/api/*.ts`)
- `GMAIL_USER` — **required** (`subratdas219@gmail.com`; fallback constant in both funcs)
- `GMAIL_APP_PASSWORD` — **required** (app password, never client-side)
- `SUPABASE_URL` — **required** by both functions
- `SUPABASE_ANON_KEY` — **required** by both functions (server creates its own client; `verifyAdmin`/`contact_thread_email` path)
- `ADMIN_EMAIL` constant falls back to `GMAIL_USER`.

**Do NOT put service_role key or GMAIL app password in the repo.** The anon key is fine (public by design).

---

## 8. Known Issues & Next Steps

- **Verify live DB state** against §6 — the single biggest risk is a table/RPC/policy missing from the production Supabase project.
- **Confirm Vercel env** has all 4 server vars; `admin` reply flow needs JWTs to verify (create a user `subratdas219@gmail.com` in Supabase Auth — schema note says only the admin user).
- **Test email round-trip end-to-end:** contact form → send-email (to owner) → read in Admin Portal → reply from Portal → check Message-ID threading → run sync-email → visitor reply lands as a `contact_replies` row without duplicates.
- **`vercel.json`** only defines the SPA rewrite; no headers/cache config. If adding headers or a cron (`/api/sync-email` is admin-JWT guarded so a public cron can't run it), extend here.
- **Clean-up candidate:** `reorder()` vs `setCollectionOrder()` duplication and the dead non-sections `reorder` push could be consolidated.
- **Build/lint:** `npm run build` (tsc -b + vite build), `npm run lint` (eslint). Run both before considering changes done.