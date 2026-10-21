// Vercel serverless function — logs resume downloads/views together with the
// visitor identity that a browser cannot see on its own: public IP, device
// (user-agent) and coarse location (country/city from Vercel's edge headers).
//
// POST JSON body:
//   { type: 'resume_download' | 'resume_view', referrer?: string, path?: string }
//
// Inserts one row into the Supabase `analytics` table via the anon key
// (policy: "public insert analytics"). Returns 200 {ok:true} on success.
// The admin Analytics page reads these rows (admin-only RLS) and renders the
// "Resume Activity" table.

export const config = { maxDuration: 10 };

type Res = {
  writeHead(status: number, headers: Record<string, string>): unknown;
  end(body?: string): unknown;
};

type Req = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
} & AsyncIterable<Buffer | string>;

function json(res: Res, status: number, data: Record<string, unknown>) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readBody(req: Req): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const ALLOWED = new Set(['resume_download', 'resume_view']);

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(res, 500, { ok: false, error: 'Supabase not configured' });
  }

  let body: { type?: unknown; referrer?: unknown; path?: unknown };
  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'Invalid JSON body' });
  }

  const type = String(body.type ?? '').trim();
  if (!ALLOWED.has(type)) return json(res, 400, { ok: false, error: 'Unsupported type' });

  const h = req.headers ?? {};
  const fwd = String(h['x-forwarded-for'] ?? '');
  const ip = String(h['x-real-ip'] ?? fwd.split(',')[0] ?? '').trim();
  const ua = String(h['user-agent'] ?? '').slice(0, 400);
  const country = String(h['x-vercel-ip-country'] ?? '').trim();
  const cityRaw = String(h['x-vercel-ip-city'] ?? '').trim();
  let city = cityRaw;
  try {
    if (cityRaw) city = decodeURIComponent(cityRaw);
  } catch {
    /* keep raw value */
  }

  const event = {
    id: 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
    type,
    referrer: String(body.referrer ?? '').slice(0, 300) || 'direct',
    path: String(body.path ?? '/').slice(0, 300),
    meta: JSON.stringify({ ip, ua, country, city }),
    created_at: new Date().toISOString(),
  };

  try {
    const r = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/analytics`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(event),
    });
    if (!r.ok) return json(res, 502, { ok: false, error: `Supabase responded ${r.status}` });
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 502, { ok: false, error: e instanceof Error ? e.message : 'log failed' });
  }
}
