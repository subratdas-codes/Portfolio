// Visitor-identity helpers shared by the admin Dashboard and Analytics pages.
// Server-logged analytics rows store a JSON blob in `meta`:
//   { ip, ua, country, region, city, isp, model, platform, project? }
// Older/fallback rows keep a plain string (empty, or the project slug).

export interface VisitorInfo {
  ip?: string;
  ua?: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  model?: string;
  platform?: string;
  project?: string;
}

export function parseVisitorMeta(meta: string | undefined): VisitorInfo {
  if (!meta || !meta.trim().startsWith('{')) return {};
  try {
    const raw = JSON.parse(meta) as Record<string, unknown>;
    const str = (k: string) => (typeof raw[k] === 'string' && raw[k] ? (raw[k] as string) : undefined);
    return {
      ip: str('ip'),
      ua: str('ua'),
      country: str('country'),
      region: str('region'),
      city: str('city'),
      isp: str('isp'),
      model: str('model'),
      platform: str('platform'),
      project: str('project'),
    };
  } catch {
    return {};
  }
}

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
  [/bot|crawler|spider|curl|wget/i, 'Bot'],
];

const MODEL_BRANDS: [RegExp, string][] = [
  [/^SM-/, 'Samsung '],
  [/^Pixel/, 'Google Pixel '],
  [/^(IN\d|ONEPLUS|HD\d|LE\d)/, 'OnePlus '],
  [/^(Moto|XT\d)/, 'Motorola '],
  [/^RMX/, 'Realme '],
  [/^CPH/, 'OPPO '],
  [/^V\d{4}/, 'vivo '],
  [/^TA-/, 'Nokia '],
  [/^(Redmi|POCO)/i, ''],
];

function brandModel(model: string): string {
  for (const [re, prefix] of MODEL_BRANDS) if (re.test(model)) return prefix + model;
  return model;
}

/** "Samsung SM-G991B · Mobile · Chrome" (falls back to UA sniffing when the
 *  browser didn't expose a model via client hints). */
export function describeClient(info: VisitorInfo): string {
  const ua = info.ua ?? '';
  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1] ?? 'Unknown';

  let device = info.model ? brandModel(info.model) : '';
  if (!device && /iPad/.test(ua)) device = 'iPad';
  if (!device && /iPhone/.test(ua)) device = 'iPhone';
  if (!device && /Android/.test(ua)) {
    const m = /Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|\))/.exec(ua);
    const raw = m ? m[1].trim() : '';
    device = raw.length > 1 && !/^(K|wv)$/.test(raw) ? brandModel(raw) : 'Android device';
  }
  if (!device && /Windows/.test(ua)) device = 'Windows PC';
  if (!device && /Macintosh|Mac OS X/.test(ua)) device = 'Mac';
  if (!device && /Linux/.test(ua)) device = 'Linux';
  if (!device && info.platform) device = info.platform;
  if (!device) device = 'Unknown device';

  const type = /iPad|Tablet/.test(ua) ? 'Tablet' : /Mobile|Android|iPhone/.test(ua) ? 'Mobile' : 'Desktop';
  return `${device} · ${type} · ${browser}`;
}

/** "Bhubaneswar, Odisha, India" — whatever geo fields are available. */
export function describeLocation(info: VisitorInfo): string {
  return [info.city, info.region, info.country].filter(Boolean).join(', ');
}
