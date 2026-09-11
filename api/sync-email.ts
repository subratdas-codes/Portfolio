// Vercel serverless function — syncs Gmail replies back into the portfolio
// contact thread (contact_replies). Admin-token guarded (supabase JWT).
//
// How threading works:
//   * Every email we send carries a subject token:  [Portfolio #<messageId>]
//   * Gmail preserves the subject (with "Re:") when the admin replies straight
//     from Gmail, and when the visitor replies to any of those emails.
//   * This function scans Gmail INBOX (visitor replies) + SENT MAIL (admin
//     replies), extracts the token, matches it to a contact_messages row, and
//     inserts/upserts a contact_replies row (deduplicated by email_message_id).
//   * The Admin Portal then shows the reply immediately via Supabase Realtime.
//
// Access: POST or GET, requires `Authorization: Bearer <supabase admin JWT>`.

export const config = { maxDuration: 20 };

const ADMIN_EMAIL = process.env.GMAIL_USER ?? 'subratdas219@gmail.com';
const TOKEN_RE = /\[Portfolio\s*#([A-Za-z0-9_-]{4,80})\]/i;
const MAX_REPLY_LEN = 50_000;

function json(res: any, status: number, data: Record<string, unknown>) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readBody(req: any): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

// Lazy-load heavy modules so cold starts are fast.
let _imapflow: typeof import('imapflow') | null = null;
async function imapflow() {
  if (!_imapflow) _imapflow = await import('imapflow');
  return _imapflow;
}
let _mailparser: typeof import('mailparser') | null = null;
async function mailparser() {
  if (!_mailparser) _mailparser = await import('mailparser');
  return _mailparser;
}
let _supabase: typeof import('@supabase/supabase-js') | null = null;
async function supabaseModule() {
  if (!_supabase) _supabase = await import('@supabase/supabase-js');
  return _supabase;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const bearer = (req.headers['authorization'] ?? '') as string;
  if (!bearer.toLowerCase().startsWith('bearer ')) {
    return json(res, 401, { error: 'Unauthorized' });
  }
  const jwt = bearer.slice(7).trim();

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return json(res, 500, { error: 'GMAIL_USER / GMAIL_APP_PASSWORD not configured' });
  }

  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return json(res, 500, { error: 'SUPABASE_URL / SUPABASE_ANON_KEY not configured' });
  }

  const sbModule = await supabaseModule();
  const sb = sbModule.createClient(url, anon, { auth: { persistSession: false } });
  await sb.auth.setSession({ access_token: jwt, refresh_token: '' });

  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || userData.user?.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return json(res, 403, { error: 'Not authorized' });
  }

  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const { data: messages, error: msgErr } = await sb
      .from('contact_messages')
      .select('id');
    if (msgErr) throw new Error(`contact_messages select: ${msgErr.message}`);
    const validIds = new Set((messages ?? []).map((m: any) => m.id));

    const { data: replies, error: repErr } = await sb
      .from('contact_replies')
      .select('email_message_id');
    if (repErr) throw new Error(`contact_replies select: ${repErr.message}`);
    const seenIds = new Set(
      (replies ?? []).map((r: any) => r.email_message_id).filter(Boolean)
    );

    const { ImapFlow } = await imapflow();
    const { simpleParser } = await mailparser();

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: process.env.GMAIL_USER!, pass: process.env.GMAIL_APP_PASSWORD! },
    });

    await client.connect();
    try {
      const mailboxes = await client.list();
      const sentPath =
        mailboxes.find((mb) => mb.attributes.includes('\\Sent'))?.path ??
        '[Gmail]/Sent Mail';

      const since = new Date(Date.now() - 90 * 24 * 3600 * 1000);

      const scanMailbox = async (path: string, sender: 'admin' | 'visitor') => {
        const lock = await client.getMailboxLock(path);
        try {
          const uids = await client.search({ subject: 'Portfolio', since }, { uid: true });
          for (const uid of uids) {
            try {
              const full = await client.fetchOne(uid, { source: true }, { uid: true });
              if (!full?.source) continue;
              const parsed = await simpleParser(Buffer.from(full.source));
              const subject = parsed.subject ?? '';
              const m = TOKEN_RE.exec(subject);
              if (!m) continue;
              const convId = m[1];
              if (!validIds.has(convId)) continue;

              const emailId = parsed.messageId ?? `uid-${uid}`;
              if (seenIds.has(emailId)) {
                skipped++;
                continue;
              }

              const body = (parsed.text || parsed.html || '').slice(0, MAX_REPLY_LEN);
              if (!body.trim()) continue;

              const { error } = await sb.from('contact_replies').insert({
                message_id: convId,
                sender,
                body,
                email_message_id: emailId,
                created_at: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
              });
              if (!error) {
                synced++;
                seenIds.add(emailId);
              } else {
                errors.push(`insert ${convId}: ${error.message}`);
              }
            } catch (e) {
              errors.push(`fetch uid ${uid}: ${e instanceof Error ? e.message : 'err'}`);
            }
          }
        } finally {
          lock.release();
        }
      };

      await scanMailbox('INBOX', 'visitor');
      await scanMailbox(sentPath, 'admin');
    } finally {
      await client.logout();
    }
  } catch (e) {
    return json(res, 500, { error: e instanceof Error ? e.message : 'sync failed', synced });
  }

  return json(res, 200, { ok: true, synced, skipped, errors });
}