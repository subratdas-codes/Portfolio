-- Thread-authorized reply insert.
--
-- The Admin Portal normally inserts into contact_replies directly (RLS:
-- authenticated). If the browser session has expired, that insert fails and
-- the reply would only exist locally. This SECURITY DEFINER function lets the
-- app store the reply in the cloud anyway: it only succeeds when the thread
-- (contact_messages.id) actually exists.
--
-- Run ONCE in the Supabase SQL Editor.

create or replace function public.add_contact_reply(p_thread_id text, p_body text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id text;
begin
  if not exists (select 1 from public.contact_messages where id = p_thread_id) then
    raise exception 'unknown thread';
  end if;
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'empty reply';
  end if;

  new_id := 'id_' || substr(md5(random()::text), 1, 12);
  insert into public.contact_replies (id, message_id, sender, body)
  values (new_id, p_thread_id, 'admin', left(p_body, 10000));
  return new_id;
end;
$$;

grant execute on function public.add_contact_reply(text, text) to anon, authenticated;
