// Vercel Cron — pings the Supabase REST API once a day so the free-tier project
// is never marked inactive and auto-paused. A paused/deleted project is what
// makes the live site fall back to stale/seed content. Keeping it active makes
// the deployed content stay live permanently.
//
// Called automatically by vercel.json crons, and also safe to hit manually:
//   GET /api/keepalive  ->  { ok: true, status: 200, ms: 123 }

export const config = { maxDuration: 10 };

type ServerResponse = {
  writeHead(status: number, headers: Record<string, string>): unknown;
  end(body?: string): unknown;
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

function json(res: ServerResponse, status: number, data: Record<string, unknown>) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

export default async function handler(req: unknown, res: ServerResponse) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json(res, 500, {
      ok: false,
      error: 'Supabase not configured (SUPABASE_URL / SUPABASE_ANON_KEY missing)',
    });
  }

  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(
      `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/profile?select=id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);

    if (!r.ok) {
      return json(res, 502, { ok: false, status: r.status, error: `Supabase responded ${r.status}` });
    }
    return json(res, 200, { ok: true, status: r.status, ms: Date.now() - started });
  } catch (e) {
    return json(res, 502, {
      ok: false,
      error: e instanceof Error ? e.message : 'Keep-alive ping failed',
    });
  }
}
