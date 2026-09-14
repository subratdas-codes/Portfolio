// ============================================================================
// Supabase Client — single shared instance for the whole app.
// Reads credentials from Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// If not configured, the app runs in local-only mode (still fully functional).
// ============================================================================

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const SUPABASE_BUCKET = 'portfolio-assets';

// --- Auth event memory ------------------------------------------------
// supabase-js may complete the recovery helper exchange (PASSWORD_RECOVERY)
// during app boot, BEFORE the reset page lazy-mounts. Capture the latest
// event + session state at module level so the reset page can read it back
// on mount instead of missing the event entirely.
export type AuthMemory = { event: string; hasSession: boolean; at: number };
let authMemory: AuthMemory = { event: 'INITIAL', hasSession: false, at: 0 };
const authListeners = new Set<() => void>();

export function getAuthMemory(): AuthMemory {
  return authMemory;
}

export function onAuthMemoryChange(cb: () => void): () => void {
  authListeners.add(cb);
  return () => { authListeners.delete(cb); };
}

if (supabase) {
  if (!supabase.auth.onAuthStateChange) {
    console.warn('[supabase] onAuthStateChange unavailable');
  } else {
    supabase.auth.onAuthStateChange((event, session) => {
      authMemory = { event, hasSession: !!session, at: Date.now() };
      authListeners.forEach((cb) => cb());
    });
  }
}