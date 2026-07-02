// ============================================================================
// Cloud Sync Layer — uses textdb.online (free, no-auth, CORS-enabled key-value
// JSON store) as a real cloud backend so data syncs across all devices.
//
// Data is split across two cloud keys to stay under the 200k-char per-key limit:
//   • DB key   → all text content + URL-based images
//   • IMG key  → base64-uploaded images (profile photo, uploads) as a map
//
// On save: base64 data URLs in the DB are extracted to the IMG map and replaced
// with `cloudimg://{id}` references. On load: references are resolved back.
// ============================================================================

const CLOUD_BASE = 'https://textdb.online';
const DB_KEY = 'subrat-portfolio-db-v8-9f3a7c';
const IMG_KEY = 'subrat-portfolio-img-v8-9f3a7c';
const LOCAL_IMG_KEY = 'subrat_portfolio_images_v1';

const isBase64 = (s: string) => typeof s === 'string' && s.startsWith('data:image');
const isCloudImg = (s: string) => typeof s === 'string' && s.startsWith('cloudimg://');

// ---------------------------------------------------------------- Push
/**
 * Push the full DB to cloud. Extracts base64 images into a separate map,
 * replacing them with cloudimg:// references so the DB payload stays small.
 */
export async function pushCloud(db: any): Promise<boolean> {
  try {
    // 1. Deep-clone and extract base64 images
    const dbClone = JSON.parse(JSON.stringify(db));
    const imgMap = await loadLocalImgMap();

    // Walk the clone and replace base64 with cloudimg:// refs
    const walk = (obj: any) => {
      if (obj === null || obj === undefined) return;
      if (Array.isArray(obj)) { obj.forEach(walk); return; }
      if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (isBase64(val)) {
            const id = 'img_' + Math.random().toString(36).slice(2, 10);
            imgMap[id] = val;
            obj[key] = 'cloudimg://' + id;
          } else if (Array.isArray(val)) {
            // Handle arrays of strings (screenshots etc.)
            obj[key] = val.map((item: any) => {
              if (isBase64(item)) {
                const id = 'img_' + Math.random().toString(36).slice(2, 10);
                imgMap[id] = item;
                return 'cloudimg://' + id;
              }
              return item;
            });
            obj[key].forEach((item: any) => { if (typeof item === 'object') walk(item); });
          } else if (typeof val === 'object') {
            walk(val);
          }
        }
      }
    };
    walk(dbClone);

    // 2. Push DB (text + refs)
    const dbStr = JSON.stringify(dbClone);
    if (dbStr.length > 195000) {
      console.warn('[cloud] DB too large (' + dbStr.length + ' chars), trimming analytics/audit');
      // Trim heavy tables to fit
      if (dbClone.analytics) dbClone.analytics = dbClone.analytics.slice(0, 100);
      if (dbClone.audit_logs) dbClone.audit_logs = dbClone.audit_logs.slice(0, 50);
    }
    const dbOk = await postText(DB_KEY, JSON.stringify(dbClone));
    if (!dbOk) return false;

    // 3. Push images map (may need to split if too large)
    const imgStr = JSON.stringify(imgMap);
    if (imgStr.length > 195000) {
      // Too many/large images — keep only the most recent ones
      const ids = Object.keys(imgMap);
      const trimmed: Record<string, string> = {};
      // Keep last 10 images
      ids.slice(-10).forEach((id) => { trimmed[id] = imgMap[id]; });
      await postText(IMG_KEY, JSON.stringify(trimmed));
      await saveLocalImgMap(trimmed);
    } else {
      await postText(IMG_KEY, imgStr);
      await saveLocalImgMap(imgMap);
    }

    console.log('[cloud] Pushed DB (' + dbStr.length + ' chars) + images (' + imgStr.length + ' chars)');
    return true;
  } catch (e) {
    console.error('[cloud] Push error:', e);
    return false;
  }
}

// ---------------------------------------------------------------- Fetch
/**
 * Fetch DB from cloud. Resolves cloudimg:// references back to base64 data
 * using the images map.
 */
export async function fetchCloud(): Promise<any | null> {
  try {
    const [dbStr, imgStr] = await Promise.all([
      getText(DB_KEY),
      getText(IMG_KEY),
    ]);

    if (!dbStr) return null;

    let db;
    try { db = JSON.parse(dbStr); } catch { return null; }
    if (!db || !db.profile) return null;

    // Parse images map
    let imgMap: Record<string, string> = {};
    if (imgStr) {
      try { imgMap = JSON.parse(imgStr); } catch { /* ignore */ }
    }
    await saveLocalImgMap(imgMap);

    // Resolve cloudimg:// refs back to base64
    const resolve = (obj: any) => {
      if (obj === null || obj === undefined) return;
      if (Array.isArray(obj)) {
        obj.forEach((val, i) => {
          if (isCloudImg(val)) {
            const id = val.replace('cloudimg://', '');
            obj[i] = imgMap[id] || val;
          } else if (typeof val === 'object') {
            resolve(val);
          }
        });
        return;
      }
      if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (isCloudImg(val)) {
            const id = val.replace('cloudimg://', '');
            obj[key] = imgMap[id] || val;
          } else if (Array.isArray(val)) {
            val.forEach((item: any, i: number) => {
              if (isCloudImg(item)) {
                const id = item.replace('cloudimg://', '');
                val[i] = imgMap[id] || item;
              } else if (typeof item === 'object') {
                resolve(item);
              }
            });
          } else if (typeof val === 'object') {
            resolve(val);
          }
        }
      }
    };
    resolve(db);

    console.log('[cloud] Fetched DB + ' + Object.keys(imgMap).length + ' images');
    return db;
  } catch (e) {
    console.error('[cloud] Fetch error:', e);
    return null;
  }
}

// ---------------------------------------------------------------- Low-level HTTP
async function postText(key: string, value: string): Promise<boolean> {
  const body = new URLSearchParams();
  body.set('key', key);
  body.set('value', value);
  const res = await fetch(CLOUD_BASE + '/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.status === 1;
}

async function getText(key: string): Promise<string | null> {
  const res = await fetch(CLOUD_BASE + '/' + key);
  if (!res.ok) return null;
  const text = await res.text();
  if (!text || text.includes('"status":-1') || text.includes('API不存在')) return null;
  return text;
}

// ---------------------------------------------------------------- Local image cache
async function loadLocalImgMap(): Promise<Record<string, string>> {
  try {
    const raw = localStorage.getItem(LOCAL_IMG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveLocalImgMap(map: Record<string, string>): Promise<void> {
  try {
    localStorage.setItem(LOCAL_IMG_KEY, JSON.stringify(map));
  } catch {
    // Quota — try saving without the largest images
    try {
      const entries = Object.entries(map).sort((a, b) => a[1].length - b[1].length);
      const trimmed: Record<string, string> = {};
      let size = 0;
      for (const [k, v] of entries.reverse()) {
        if (size + v.length > 2000000) break;
        trimmed[k] = v;
        size += v.length;
      }
      localStorage.setItem(LOCAL_IMG_KEY, JSON.stringify(trimmed));
    } catch { /* give up */ }
  }
}
