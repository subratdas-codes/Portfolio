// Persistent "highlight" flags for analytics rows.
//
// A highlight is a manual bookmark the admin puts on a visitor / project /
// resume event (e.g. "this looks like a recruiter — follow up"). It must
// survive refreshes and device changes, so it is stored twice:
//
//   1. localStorage  → instant, works offline and before the SQL migration
//   2. Supabase      → `analytics.highlighted` (see add-analytics-highlight.sql)
//
// Pending local changes are tracked so a cloud read can never wipe a highlight
// that has not been written yet (or that could not be written because the
// column/policy does not exist).

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

const KEY = 'sd_analytics_highlights';
const PENDING_KEY = 'sd_analytics_highlights_pending';

type Pending = Record<string, boolean>;

const listeners = new Set<() => void>();
let cache: Set<string> | null = null;
let pendingCache: Pending | null = null;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function read(): Set<string> {
  if (cache) return cache;
  const arr = safeParse<string[]>(typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY), []);
  cache = new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
  return cache;
}

function readPending(): Pending {
  if (pendingCache) return pendingCache;
  const obj = safeParse<Pending>(typeof localStorage === 'undefined' ? null : localStorage.getItem(PENDING_KEY), {});
  pendingCache = obj && typeof obj === 'object' ? obj : {};
  return pendingCache;
}

function persist(set: Set<string>) {
  cache = set;
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* storage full / disabled */
  }
}

function persistPending(map: Pending) {
  pendingCache = map;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function notify() {
  listeners.forEach((l) => l());
}

/** All highlighted ids, newest state. */
export function getHighlightedIds(): string[] {
  return [...read()];
}

export function isRowHighlighted(id: string): boolean {
  return read().has(id);
}

/** Write one highlight to Supabase (RPC first, direct update as fallback). */
async function pushHighlight(id: string, value: boolean): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.rpc('set_analytics_highlight', { p_id: id, p_value: value });
    if (!error) return true;
  } catch {
    /* fall through to direct update */
  }
  try {
    const { error } = await supabase.from('analytics').update({ highlighted: value }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

let flushing = false;

/** Retry pending writes that failed offline or before the SQL migration ran. */
async function flushPendingHighlights(): Promise<void> {
  if (flushing || !supabase || !isSupabaseConfigured) return;
  const ids = Object.keys(readPending());
  if (ids.length === 0) return;
  flushing = true;
  try {
    for (const id of ids) {
      const value = readPending()[id];
      if (typeof value === 'boolean') await pushHighlight(id, value);
    }
  } finally {
    flushing = false;
  }
}

/** Toggle (or force) the highlight for one analytics row. */
export async function setRowHighlight(id: string, value?: boolean): Promise<boolean> {
  const current = read();
  const next = value ?? !current.has(id);
  const nextSet = new Set(current);
  if (next) nextSet.add(id);
  else nextSet.delete(id);
  persist(nextSet);

  const pending = { ...readPending(), [id]: next };
  persistPending(pending);
  notify();

  // Keep the pending entry until a cloud read confirms the new value. This
  // prevents a stale in-flight read from undoing a fresh toggle.
  await pushHighlight(id, next);
  return next;
}

/** Forget an id completely — used after the analytics row itself is deleted,
 *  so a stale highlight cannot survive in localStorage. */
export function forgetRow(id: string): void {
  const current = read();
  if (current.has(id)) {
    const next = new Set(current);
    next.delete(id);
    persist(next);
  }
  const pending = { ...readPending() };
  if (Object.prototype.hasOwnProperty.call(pending, id)) {
    delete pending[id];
    persistPending(pending);
  }
  notify();
}

/** Merge cloud `highlighted` flags into the local set. Cloud is authoritative
 *  for rows it returns, except for ids that still have a pending local write.
 *  Does nothing when the column does not exist yet (migration not run). */
export function mergeCloudHighlights(rows: Array<{ id?: string; highlighted?: boolean | null }>): void {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const hasColumn = rows.some((r) => Object.prototype.hasOwnProperty.call(r, 'highlighted'));
  if (!hasColumn) return;

  const cloudIds = new Set(rows.map((r) => String(r.id)));
  const cloudValue = new Map<string, boolean>();
  const next = new Set<string>();
  rows.forEach((r) => {
    const id = String(r.id);
    const on = !!r.highlighted;
    cloudValue.set(id, on);
    if (on) next.add(id);
  });

  // Keep local-only highlights for rows the cloud did not return.
  read().forEach((id) => {
    if (!cloudIds.has(id)) next.add(id);
  });

  // Pending local toggles win over the cloud value.
  const pending = readPending();
  const confirmed: string[] = [];
  Object.entries(pending).forEach(([id, on]) => {
    if (on) next.add(id);
    else next.delete(id);
    if (cloudValue.has(id) && cloudValue.get(id) === on) confirmed.push(id);
  });

  // The cloud now agrees with these writes, so they no longer need protection.
  if (confirmed.length) {
    const rest = { ...pending };
    confirmed.forEach((id) => delete rest[id]);
    persistPending(rest);
  }

  const current = read();
  const same = current.size === next.size && [...current].every((id) => next.has(id));
  if (same) return;
  persist(next);
  notify();
}

/** React hook — re-renders when any highlight changes and keeps the local set
 *  in sync with the analytics rows that come from the cloud. */
export function useHighlights(rows?: Array<{ id?: string; highlighted?: boolean | null }>) {
  const [ids, setIds] = useState<Set<string>>(() => new Set(read()));

  useEffect(() => {
    const listener = () => setIds(new Set(read()));
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    void flushPendingHighlights();
  }, []);

  useEffect(() => {
    if (rows) mergeCloudHighlights(rows);
  }, [rows]);

  return {
    highlighted: ids,
    isHighlighted: (id: string) => ids.has(id),
    toggle: (id: string) => setRowHighlight(id),
  };
}
