// Vercel serverless function — sends email via Gmail SMTP (nodemailer).
// Credentials come from env: GMAIL_USER + GMAIL_APP_PASSWORD (never client-side).
//
// POST JSON body:
//   { to: string, subject: string, html: string, [fromName], [replyTo], [threadId] }
//
// Access rules:
//   * Anonymous (contact form): only allowed when `to` equals the owner email
//     (GMAIL_USER) — prevents the endpoint being abused as a spam relay.
//   * Authenticated (admin reply): send `Authorization: Bearer <supabase JWT>`;
//     server verifies the token belongs to the admin email, then `to` is free.
//
// Returns 200 {ok:true} on success, 4xx/5xx with {error} otherwise.

export const config = { maxDuration: 10 };

const ADMIN_EMAIL = process.env.GMAIL_USER ?? 'subratdas219@gmail.com';

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

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Lazy-load heavy modules so cold starts are fast and simple GET → 405 is instant.
let _nodemailer: typeof import('nodemailer') | null = null;
async function nodemailer() {
  if (!_nodemailer) _nodemailer = await import('nodemailer');
  return _nodemailer;
}
let _supabase: typeof import('@supabase/supabase-js') | null = null;
async function supabaseModule() {
  if (!_supabase) _supabase = await import('@supabase/supabase-js');
  return _supabase;
}

let _transporter: any = null;
async function getTransporter() {
  if (_transporter) return _transporter;
  const nm = await nodemailer();
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  _transporter = nm.default.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
  return _transporter;
}

async function verifyAdmin(accessToken: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  try {
    const sbModule = await supabaseModule();
    const sb = sbModule.createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await sb.auth.getUser(accessToken);
    return !error && data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  } catch {
    return false;
  }
}

export default async function handler(req: any, res: any) {
  // --- GET returns 405 instantly (no imports, no awaits) -------------------
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return json(res, 500, { error: 'GMAIL_USER / GMAIL_APP_PASSWORD not configured' });
  }

  let body: {
    to?: string;
    subject?: string;
    html?: string;
    fromName?: string;
    replyTo?: string;
    threadId?: string;
  };

  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const to = (body.to ?? '').trim();
  const subject = (body.subject ?? '').trim();
  const html = (body.html ?? '').trim();
  if (!to || !subject || !html) {
    return json(res, 400, { error: 'to, subject and html are required' });
  }
  if (subject.length > 500 || html.length > 100_000) {
    return json(res, 413, { error: 'Payload too large' });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(to) || (body.replyTo && !emailRe.test(body.replyTo)) || (body.replyTo && body.replyTo.length > 254)) {
    return json(res, 400, { error: 'Invalid email address' });
  }

  // Authz gate: anonymous → owner's own address only. Admin replies → verify JWT.
  const bearer = (req.headers['authorization'] ?? '') as string;
  const isAdmin = bearer.toLowerCase().startsWith('bearer ')
    ? await verifyAdmin(bearer.slice(7).trim())
    : false;

  if (to.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && !isAdmin) {
    return json(res, 403, { error: 'Not authorized to send to that address' });
  }

  const fromName = (body.fromName ?? 'Subrat Das').slice(0, 80).replace(/[<>\r\n]/g, '');
  const mailMsg: Record<string, unknown> = {
    from: `"${fromName}" <${ADMIN_EMAIL}>`,
    to,
    subject,
    html,
    text: htmlToText(html),
  };
  if (body.replyTo) mailMsg.replyTo = body.replyTo;
  if (body.threadId) {
    mailMsg.messageId = `<portfolio-${body.threadId}-${Date.now()}@subratdas.vercel.app>`;
  }

  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailMsg);
    return json(res, 200, { ok: true });
  } catch (e) {
    _transporter = null; // discard dead transporter so next call reconnects
    return json(res, 500, { error: e instanceof Error ? e.message : 'send failed' });
  }
}