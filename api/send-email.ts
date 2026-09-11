// Vercel serverless function — sends email via Gmail SMTP (nodemailer).
// Credentials come from env: GMAIL_USER + GMAIL_APP_PASSWORD (never client-side).
//
// POST JSON body:
//   { to: string, subject: string, html: string, [fromName], [replyTo], [threadId], [body] }
//
// Access rules:
//   * Anonymous (contact form): only allowed when `to` equals the owner email
//     (GMAIL_USER) — prevents the endpoint being abused as a spam relay.
//   * Authenticated (admin reply): send `Authorization: Bearer <supabase JWT>`;
//     server verifies the token belongs to the admin email, then `to` is free.
//
// Returns 200 {ok:true} on success, 4xx/5xx with {error} otherwise.

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 10 };

type Body = {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
  threadId?: string;
  body?: string;
};

const ADMIN_EMAIL = process.env.GMAIL_USER ?? 'subratdas219@gmail.com';

function verifyAdmin(accessToken: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return Promise.resolve(false);
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  return sb.auth.getUser(accessToken).then(({ data, error }) =>
    !error && data.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  ).catch(() => false);
}

let transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
  return transporter;
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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return new Response(
      JSON.stringify({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD not configured' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const to = (body.to ?? '').trim();
  const subject = (body.subject ?? '').trim();
  const html = (body.html ?? '').trim();
  if (!to || !subject || !html) {
    return new Response(JSON.stringify({ error: 'to, subject and html are required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Enforce size limits + basic validation server-side.
  if (subject.length > 500 || html.length > 100_000 || body.body?.length > 50_000) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), {
      status: 413,
      headers: { 'content-type': 'application/json' },
    });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(to) || (body.replyTo && !emailRe.test(body.replyTo)) || (body.replyTo && body.replyTo.length > 254)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Authz gate: anonymous → owner's own address only. Admin replies → verify JWT.
  const bearer = req.headers.get('authorization') ?? '';
  const isAdmin = bearer?.toLowerCase().startsWith('bearer ')
    ? await verifyAdmin(bearer.slice(7).trim())
    : false;

  if (to.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && !isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Not authorized to send to that address' }),
      { status: 403, headers: { 'content-type': 'application/json' } }
    );
  }

  const fromName = (body.fromName ?? 'Subrat Das').slice(0, 80);
  const msg: nodemailer.SendMailOptions = {
    from: `"${fromName.replace(/[<>\r\n]/g, '')}" <${ADMIN_EMAIL}>`,
    to,
    subject,
    html,
    text: htmlToText(html),
  };
  if (body.replyTo) msg.replyTo = body.replyTo;
  if (body.threadId) {
    msg.messageId = `<portfolio-${body.threadId}-${Date.now()}@subratdas.vercel.app>`;
  }

  try {
    await getTransporter().sendMail(msg);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    const msgErr = e instanceof Error ? e.message : 'send failed';
    // Discard a dead transporter so the next call reconnects cleanly.
    transporter = null;
    return new Response(JSON.stringify({ error: msgErr }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}