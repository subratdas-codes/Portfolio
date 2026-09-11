// Vercel serverless function — sends email via Resend (free ~100/day).
// No activation step, no SMTP credentials. Requires RESEND_API_KEY env var.
//
// POST JSON body:
//   { to: string, subject: string, html: string, [fromName], [replyTo] }
// Returns 200 {ok:true} on success, 4xx/5xx with {error} otherwise.

export const config = { maxDuration: 10 };

type Body = {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
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

  const fromEnv = process.env.RESEND_FROM;
  const from = (fromEnv && fromEnv.trim()) || `${body.fromName ?? 'Subrat Das'} <onboarding@resend.dev>`.trim();

  const payload: Record<string, unknown> = {
    from,
    to,
    subject,
    html,
  };
  if (body.replyTo) payload.reply_to = body.replyTo;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text().catch(() => '');
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Resend error ${res.status}: ${text}` }), {
        status: res.status,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? 'send failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}