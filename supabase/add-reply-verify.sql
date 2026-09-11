-- ============================================================================
-- contact thread verification for admin replies.
--
-- The Admin Portal emails a reply to the visitor via /api/send-email. That
-- endpoint is protected so it can't be abused as a spam relay: an anonymous
-- call may only send to the owner (GMAIL_USER), and admin replies require a
-- verified Supabase JWT.
--
-- Problem: authorization for replies depends entirely on a browser session
-- (JWT). If the session expires, replies silently fail.
--
-- This function gives the API a JWT-independent way to authorize a reply:
-- the Portal sends `threadId` (the contact_messages.id from the subject line,
-- e.g. [Portfolio #<id>]) plus the visitor's `to` address. The API checks that
-- the thread exists AND its email matches `to`. Only then is the email sent.
-- SECURITY DEFINER: the callable (anon) can retrieve the email for a thread id
-- only — message bodies stay protected by RLS.
-- Run ONCE in the Supabase dashboard SQL Editor.
-- ============================================================================

create or replace function public.contact_thread_email(p_thread_id text)
returns text
language sql
security definer
set search_path = public
as $$
  select email
  from public.contact_messages
  where id = p_thread_id
$$;

-- Known app users only; anon gets just this one function.
grant execute on function public.contact_thread_email(text) to anon, authenticated;