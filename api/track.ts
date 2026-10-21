// Vercel serverless function — logs resume downloads/views, project opens and
// site visits together with visitor identity a browser cannot see on its own:
// public IP, device (user-agent + client hints), location and ISP.
//
// POST JSON body:
//   { type: 'resume_download' | 'resume_view' | 'project_view' | 'page_view',
//     meta?: string,          // project slug for project_view
//     referrer?: string, path?: string,
//     hints?: { model?, platform?, platformVersion? } }
//
// Inserts one row into the Supabase `analytics` table via the anon key
// (policy: "public insert analytics"). Returns 200 {ok:true} on success.

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

const ALLOWED = new Set(['resume_download', 'resume_view', 'project_view', 'page_view']);

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

type IpWho = {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  connection?: { isp?: string; org?: string };
};

/** Best-effort IP → ISP/city/region lookup (free, no key, HTTPS).
 *  Falls back to Vercel's edge geo headers on any failure/timeout. */
async function lookupIp(ip: string): Promise<IpWho | null> {
  if (!ip || /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|unknown|$)/.test(ip)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const r = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,city,region,country,latitude,longitude,connection`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!r.ok) return null;
    const d = (await r.json()) as IpWho;
    return d && d.success !== false ? d : null;
  } catch {
    return null;
  }
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(res, 500, { ok: false, error: 'Supabase not configured' });
  }

  let body: Record<string, unknown>;
  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { ok: false, error: 'Invalid JSON body' });
  }

  const type = String(body.type ?? '').trim();
  if (!ALLOWED.has(type)) return json(res, 400, { ok: false, error: 'Unsupported type' });

  const project = type === 'project_view' ? String(body.meta ?? '').slice(0, 200) : '';
  if (type === 'project_view' && !project) {
    return json(res, 400, { ok: false, error: 'meta (project slug) is required for project_view' });
  }

  const hints = (body.hints && typeof body.hints === 'object' ? body.hints : {}) as Record<string, unknown>;
  const hint = (k: string) => (typeof hints[k] === 'string' ? String(hints[k]).slice(0, 120) : '');

  const h = req.headers ?? {};
  const fwd = String(h['x-forwarded-for'] ?? '');
  const ip = String(h['x-real-ip'] ?? fwd.split(',')[0] ?? '').trim();
  const ua = String(h['user-agent'] ?? '').slice(0, 400);

  // Vercel edge geo headers (free, always present on deployments).
  const edgeCountry = String(h['x-vercel-ip-country'] ?? '').trim();
  const edgeRegion = String(h['x-vercel-ip-country-region'] ?? '').trim();
  let edgeCity = String(h['x-vercel-ip-city'] ?? '').trim();
  try {
    if (edgeCity) edgeCity = decodeURIComponent(edgeCity);
  } catch {
    /* keep raw value */
  }

  const geo = await lookupIp(ip);

  const meta: Record<string, unknown> = {
    type,
    ip,
    ua,
    country: geo?.country || edgeCountry,
    region: geo?.region || edgeRegion,
    city: geo?.city || edgeCity,
    isp: geo?.connection?.isp || geo?.connection?.org || '',
    lat: geo?.latitude ?? null,
    lon: geo?.longitude ?? null,
    model: hint('model'),
    platform: hint('platform'),
  };
  if (project) meta.project = project;

  const event = {
    id: 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
    type,
    referrer: String(body.referrer ?? '').slice(0, 300) || 'direct',
    path: String(body.path ?? '/').slice(0, 300),
    meta: JSON.stringify(meta),
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
