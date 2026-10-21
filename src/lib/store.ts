// ============================================================================
// Data Store — reactive data layer with SUPABASE back-end.
//
// Architecture:
//   1. On load: read from localStorage cache (instant display) — seed if none.
//   2. Background: pull all tables from Supabase (project-wide source of truth).
//   3. On writes: localStorage immediately + push the row to Supabase. Everyone
//      (admin + visitors) reads the same cloud DB, so edits are permanent and
//      shared across all devices.
//   4. Realtime: subscribe to Supabase Realtime so live changes from the admin
//      appear instantly on every open viewer tab — no refresh needed.
//
// API mirrors the original store (select/insert/update/delete...) so none of the
// React components had to change.
// ============================================================================

import type { Schema, TableName, CollectionTable, SingletonTable } from './types';
import { seedData } from './seed';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'subrat_portfolio_db_v9';
const SESSION_KEY = 'subrat_portfolio_session_v1';
const DRAFT_KEY = 'subrat_portfolio_draft_v1';
const SEEDED_KEY = 'subrat_portfolio_supabase_seeded_v1';
const ORDER_KEY = 'subrat_portfolio_order_v1';

/** Ensure a mailto: URL always carries a prefilled subject + body.
 *  Leaves non-mailto links untouched, and never duplicates ?params. */
export function enrichMailto(url: string): string {
  if (!url || !url.toLowerCase().startsWith('mailto:')) return url;
  if (url.includes('?')) return url;
  const subject = encodeURIComponent("Let's work together");
  const body = encodeURIComponent(["Hi Subrat,", '', "I came across your portfolio and I'd like to share an opportunity.", '', 'Best regards'].join('\n'));
  return `${url}?subject=${subject}&body=${body}`;
}

/** Returns a Gmail compose URL built from a mailto: link (with subject/body if present). */
export function mailtoToGmail(url: string): string {
  const clean = url.replace(/^mailto:/i, '');
  const qIdx = clean.indexOf('?');
  const to = qIdx >= 0 ? clean.slice(0, qIdx) : clean;
  const params = new URLSearchParams(qIdx >= 0 ? clean.slice(qIdx + 1) : '');
  const q = new URLSearchParams();
  if (to) q.set('to', to);
  if (params.get('subject')) q.set('su', params.get('subject') as string);
  if (params.get('body')) q.set('body', params.get('body') as string);
  return `https://mail.google.com/mail/?view=cm&fs=1&${q.toString()}`;
}

/** True when the device looks like a phone/tablet (native mail app handles mailto:). */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent) && !/Windows Phone/i.test(navigator.userAgent);
}

/** Href used for an email button: native mailto on mobile, Gmail compose on
 *  desktop (where mailto: often does nothing without a registered mail client). */
export function emailHref(url: string): string {
  const mailto = enrichMailto(url);
  if (!mailto.startsWith('mailto:')) return url;
  return isMobileDevice() ? mailto : mailtoToGmail(mailto);
}

/** Returns true when the given URL is a mailto link (email button). */
export function isMailtoUrl(url: string): boolean {
  return !!url && url.toLowerCase().startsWith('mailto:');
}

type Listener = () => void;

export type DB = { [K in TableName]: Schema[K][] } & { _v?: number; _updatedAt?: string };

// Tables that are safe for PUBLIC (anon) reads — everything except private ones.
const PUBLIC_TABLES: TableName[] = [
  'profile', 'hero', 'about', 'skills', 'education', 'experience', 'projects',
  'certificates', 'achievements', 'gallery', 'testimonials', 'blogs',
  'coding_profiles', 'social_links', 'resume', 'settings', 'sections',
];
const PRIVATE_TABLES: TableName[] = ['analytics', 'audit_logs', 'contact_messages', 'contact_replies'];
const ALL_TABLES: TableName[] = [...PUBLIC_TABLES, ...PRIVATE_TABLES];

// Tables to push into Supabase during seeding (skip private/demo content).
const SEED_TABLES: TableName[] = [
  'profile', 'hero', 'about', 'skills', 'education', 'experience', 'projects',
  'certificates', 'achievements', 'gallery', 'testimonials', 'blogs',
  'coding_profiles', 'social_links', 'resume', 'settings', 'sections',
];

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.profile && Array.isArray(parsed.profile) && parsed.sections) {
        // Merge so collections added in newer versions of the app exist even in
        // caches written before they were introduced (e.g. contact_replies).
        const fresh = seedData() as DB;
        for (const table of ALL_TABLES) {
          if (!Array.isArray((parsed as any)[table])) (parsed as any)[table] = clone(fresh[table] ?? []);
        }
        if (!Array.isArray(parsed.analytics)) (parsed as any).analytics = [];
        if (!Array.isArray(parsed.audit_logs)) (parsed as any).audit_logs = [];
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  const seeded = seedData() as DB;
  seeded._v = 1;
  seeded._updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  } catch {
    /* ignore */
  }
  return seeded;
}

let db: DB = loadDB();
const listeners = new Set<Listener>();

// ------------------------------------------------------------------ Order map
// Client-side display order per collection (survives refresh). The cloud gets a
// best-effort sort_order write; until every table has that column the local map
// keeps our order stable and visible.
type OrderMap = Record<string, string[]>;
function loadOrderMap(): OrderMap {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) return JSON.parse(raw) as OrderMap;
  } catch { /* ignore */ }
  return {};
}
let orderMap = loadOrderMap();
function saveOrderMap() {
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(orderMap)); } catch { /* ignore */ }
}
function normalizedOrder(table: TableName, rows: Schema[TableName][]): string[] {
  const known = orderMap[table];
  if (!known || !known.length) return [];
  const ids = new Set(rows.map((r) => (r as { id?: string }).id).filter(Boolean));
  const kept = known.filter((id) => ids.has(id));
  const tail = rows.map((r) => (r as { id?: string }).id).filter((id): id is string => !!id && !kept.includes(id));
  return [...kept, ...tail];
}
function sortByOrder<T>(table: TableName, list: T[]): T[] {
  const order = orderMap[table];
  if (!order || !order.length) return list;
  const idx = new Map(order.map((id, i) => [id, i]));
  return [...list].sort((a, b) => {
    const ia = (a as { id?: string }).id ? idx.get((a as { id: string }).id) ?? Infinity : Infinity;
    const ib = (b as { id?: string }).id ? idx.get((b as { id: string }).id) ?? Infinity : Infinity;
    return ia - ib;
  });
}
function setTableOrder(table: TableName, ids: string[]) {
  orderMap[table] = ids;
  saveOrderMap();
}
// Re-apply the client-side order map on top of cloud rows so a reorder is
// never reverted by the next sync.
function formatFetched(table: TableName, rows: unknown[]): unknown[] {
  return sortByOrder(table, rows);
}

let isCloudSyncing = false;
let syncSuccessCount = 0;
let lastPersistError: string | null = null;
let lastCloudError: string | null = null;

const pushQueue: Promise<unknown>[] = [];

// Bumped on every store change so useSyncExternalStore snapshots stay O(1)
// instead of JSON.stringify-ing the whole database on each render.
let dbVersion = 0;
export function getDBVersion(): number {
  return dbVersion;
}
export function getStatusKey(): string {
  return `${syncSuccessCount}|${lastCloudError ?? ''}|${lastPersistError ?? ''}|${isCloudSyncing ? 1 : 0}|${toasts.map((t) => t.id).join(',')}`;
}

// localStorage writes are coalesced: the first write after idle runs right away
// (so getPersistError() still reports quota errors synchronously), rapid
// follow-up writes are deferred to a trailing flush instead of stringify-ing the
// whole DB inside every click handler.
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let lastPersistAt = 0;
function writeLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    lastPersistError = null;
  } catch (e) {
    lastPersistError = e instanceof Error ? e.message : 'Storage quota exceeded';
    console.warn('[store] Local persist failed:', lastPersistError);
  }
}
function persistLocal() {
  const wait = 400 - (Date.now() - lastPersistAt);
  if (wait <= 0) {
    lastPersistAt = Date.now();
    writeLocal();
    return;
  }
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    lastPersistAt = Date.now();
    writeLocal();
  }, wait);
}
function flushPersist() {
  if (!persistTimer) return;
  clearTimeout(persistTimer);
  persistTimer = null;
  lastPersistAt = Date.now();
  writeLocal();
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPersist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersist();
  });
}

function notify() {
  dbVersion += 1;
  listeners.forEach((l) => l());
}

// ---------------------------------------------------------------- Toasts
// Tiny transient messages ("Skills — updated live") shared by admin screens.
export interface ToastMsg {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}
let toasts: ToastMsg[] = [];
let toastSeq = 0;
export function toast(message: string, tone: ToastMsg['tone'] = 'success'): void {
  const id = ++toastSeq;
  toasts = [...toasts, { id, message, tone }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 2800);
}
export function getToasts(): ToastMsg[] {
  return toasts;
}

// ---------------------------------------------------------------- Cross-tab live sync
// When Supabase isn't configured (or realtime is down), tabs in the same
// browser still share localStorage. Listen for writes from other tabs so an
// admin edit/delete/publish shows up LIVE on the public site without a reload.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as DB;
        if (parsed && Array.isArray(parsed.profile) && Array.isArray(parsed.sections)) {
          db = parsed;
          notify(); // adopt other tab's state — don't re-persist (avoids echo loops)
        }
      } catch { /* ignore malformed writes */ }
    } else if (e.key === ORDER_KEY && e.newValue) {
      try {
        orderMap = JSON.parse(e.newValue) as OrderMap;
        notify();
      } catch { /* ignore */ }
    }
  });
}

function emit() {
  persistLocal();
  notify();
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getDB(): DB {
  return db;
}

// ---------------------------------------------------------------- Supabase push
// Writes that failed (offline / RLS / transient errors) stay queued here so they
// can be retried and so a cloud fetch never resurrects a locally-deleted row or
// drops a locally-added one before the retry lands.
type FailedOp = { kind: 'insert' | 'update' | 'delete' | 'upsert' | 'reorder'; table: TableName; payload: any };
const failedOps: FailedOp[] = [];

function enqueueFailed(op: FailedOp) {
  const idx = failedOps.findIndex((o) => o.kind === op.kind && o.table === op.table && o.payload?.id === op.payload?.id);
  if (idx >= 0) failedOps[idx] = op;
  else failedOps.push(op);
}

function pendingDeleteIds(table: TableName): Set<string> {
  return new Set(failedOps.filter((o) => o.kind === 'delete' && o.table === table).map((o) => String(o.payload?.id)));
}
function pendingInserts(table: TableName): any[] {
  return failedOps.filter((o) => o.kind === 'insert' && o.table === table).map((o) => o.payload);
}
function pendingPatchIds(table: TableName): Set<string> {
  return new Set(failedOps.filter((o) => o.kind === 'update' && o.table === table).map((o) => String(o.payload?.id)));
}

async function execPush(op: FailedOp): Promise<{ error: any }> {
  const from = op.table;
  if (op.kind === 'delete') {
    const { error } = await supabase!.from(from).delete().eq('id', op.payload.id);
    return { error };
  }
  if (op.kind === 'insert') {
    const { error } = await supabase!.from(from).insert(op.payload);
    return { error };
  }
  if (op.kind === 'upsert') {
    const { error } = await supabase!.from(from).upsert(op.payload.rows || op.payload, op.payload.opts || { onConflict: 'id' });
    return { error };
  }
  if (op.kind === 'reorder') {
    for (const row of op.payload) {
      const { error } = await supabase!.from(from).update({ order: row.order }).eq('id', row.id);
      if (error) return { error };
    }
    return { error: null };
  }
  const { error } = await supabase!.from(from).update(op.payload.patch).eq('id', op.payload.id);
  return { error };
}

/** Re-attempt every failed write. Resolves true when the queue is empty. */
export async function retryFailedOps(): Promise<boolean> {
  if (!supabase || !failedOps.length) return failedOps.length === 0;
  const ops = [...failedOps];
  for (const op of ops) {
    try {
      const { error } = await execPush(op);
      // A duplicate-key insert means the row already landed — treat as done.
      if (error && !(op.kind === 'insert' && (error as { code?: string }).code === '23505')) {
        lastCloudError = (error as { message?: string })?.message ?? 'Cloud sync failed';
        continue;
      }
      failedOps.splice(failedOps.indexOf(op), 1);
      lastCloudError = null;
    } catch (e) {
      lastCloudError = (e as { message?: string })?.message ?? 'Cloud sync failed';
    }
  }
  return failedOps.length === 0;
}

function pushTable(kind: 'insert' | 'update' | 'delete' | 'upsert' | 'reorder', table: TableName, payload?: any, opts?: any, silent = false) {
  if (!supabase) return;
  const op: FailedOp = { kind, table, payload: kind === 'upsert' ? { ...(payload || {}), opts } : payload };
  const promise = execPush(op)
    .then(({ error }) => {
      if (error) throw error;
      lastCloudError = null;
      const i = failedOps.indexOf(op);
      if (i >= 0) failedOps.splice(i, 1);
    })
    .catch((e) => {
      console.warn('[store] Supabase push failed', table, e);
      if (!silent) {
        lastCloudError = (e as { message?: string })?.message ?? 'Cloud sync failed';
        enqueueFailed(op);
      }
      throw e;
    });
  promise.catch(() => {}); // rejection is surfaced via forceCloudSync/getSyncStatus
  pushQueue.push(promise);
  promise
    .finally(() => {
      const i = pushQueue.indexOf(promise);
      if (i >= 0) pushQueue.splice(i, 1);
    })
    .catch(() => {}); // derived promise rejects with the original — swallow here
  return promise;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Await the in-flight writes (current + previously failed retries).
 *  Time-boxed so a hung network request can never freeze the UI. */
export async function forceCloudSync(): Promise<boolean> {
  try {
    if (pushQueue.length) {
      await Promise.race([Promise.allSettled([...pushQueue]), delay(8000)]);
    }
    if (supabase && isAuthenticated() && isSupabaseConfigured && failedOps.length) {
      await Promise.race([retryFailedOps(), delay(8000)]);
    }
  } catch (e) {
    console.warn('[store] Force sync failed', e);
  }
  notify();
  return failedOps.length === 0 && !lastCloudError;
}

/** Push every row we have for every seedable table (used for seeding / reset). */
async function pushAllTables(): Promise<void> {
  const jobs = SEED_TABLES.map((t) => {
    const rows = (db[t] as Schema[typeof t][]) ?? [];
    if (!rows.length) return Promise.resolve();
    return supabase!.from(t).upsert(rows as any, { onConflict: 'id' }).then(({ error }) => {
      if (error) throw error;
    });
  });
  await Promise.all(jobs);
}

// ---------------------------------------------------------------- Cloud sync
async function fetchTableRows(t: TableName): Promise<{ table: TableName; rows: any[]; denied: boolean }> {
  if (!supabase) return { table: t, rows: [], denied: true };
  const authed = isAuthenticated();
  if (PRIVATE_TABLES.includes(t) && !authed) return { table: t, rows: [], denied: true };
  const rowsQuery = supabase.from(t).select('*');
  const { data, error } = await rowsQuery;
  if (error) throw error;
  return { table: t, rows: data as any[] ?? [], denied: false };
}

/** Merge fetched cloud rows into the local store without losing optimistic
 *  local changes: rows with a pending (failed) delete stay deleted, rows with a
 *  pending insert stay added, and rows with a pending update keep local values.
 *  This is what stops a slow/failed cloud write from resurrecting deleted items
 *  or dropping new ones on the next poll/realtime event. */
function applyCloudRows(table: TableName, rows: any[]): void {
  if (!Array.isArray(rows) || !rows.length) return;
  let next = rows;
  const dels = pendingDeleteIds(table);
  if (dels.size) next = next.filter((r) => r && !dels.has(String((r as { id?: string }).id)));
  const ins = pendingInserts(table);
  if (ins.length) {
    const have = new Set(next.map((r) => String((r as { id?: string }).id)));
    next = [...ins.filter((p) => p && !have.has(String(p.id))), ...next];
  }
  const patches = pendingPatchIds(table);
  if (patches.size) {
    const localById = new Map(((db[table] as unknown[]) ?? []).map((r) => [String((r as { id?: string }).id), r]));
    next = next.map((r) => (patches.has(String((r as { id?: string }).id)) ? localById.get(String((r as { id?: string }).id)) ?? r : r));
  }
  if (!next.length) return;
  (db as any)[table] = formatFetched(table, next);
  persistLocal();
}

export async function syncFromCloud(): Promise<void> {
  if (!supabase) return;
  if (isCloudSyncing) return;
  isCloudSyncing = true;
  try {
    // Flush any writes that failed earlier (offline, transient RLS/network).
    if (failedOps.length) retryFailedOps().then((ok) => { if (ok) notify(); });

    const authed = isAuthenticated();
    const tables = authed ? ALL_TABLES : PUBLIC_TABLES;
    const results = await Promise.allSettled(tables.map(fetchTableRows));

    let anyData = false;
    for (const r of results) {
      if (r.status === 'rejected') {
        const msg = (r.reason as { message?: string })?.message || 'Cloud read failed';
        lastCloudError = msg;
        console.warn('[store] read failed', msg);
        continue;
      }
      const { table, rows, denied } = r.value;
      if (denied) continue;
      if (rows.length > 0) {
        applyCloudRows(table as TableName, rows as any[]);
        anyData = true;
      }
    }
    if (anyData) persistLocal();
    if (!failedOps.length) lastCloudError = null;
    syncSuccessCount += 1;

    // First-time seeding: authenticated admin + Supabase is fresh (profile empty).
    if (authed && !localStorage.getItem(SEEDED_KEY)) {
      const profileRes = results.find((r) => r.status === 'fulfilled' && r.value.table === 'profile');
      const isEmpty = !profileRes || (profileRes.status === 'fulfilled' && (profileRes.value.rows ?? []).length === 0);
      if (isEmpty && isSupabaseConfigured) {
        await pushAllTables();
      }
      localStorage.setItem(SEEDED_KEY, '1');
    }

    notify();
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Cloud sync failed';
    lastCloudError = msg;
    console.warn('[store] Cloud sync error:', e);
  } finally {
    isCloudSyncing = false;
    notify();
  }
}

export function startCloudPolling(intervalMs = 15000): () => void {
  const timer = setInterval(() => {
    syncFromCloud();
  }, intervalMs);
  return () => clearInterval(timer);
}

export function getSyncStatus() {
  return { cloudError: lastCloudError, localError: lastPersistError, version: syncSuccessCount, syncing: isCloudSyncing };
}

// ---------------------------------------------------------------- Realtime
let realtimeStarted = false;

// Supabase emits one postgres_changes event PER changed row, so a bulk save can
// produce dozens of events at once. Coalesce them into a single refetch per
// table (throttled + trailing) instead of hammering the network and the UI.
const refetchTimers = new Map<TableName, ReturnType<typeof setTimeout>>();
const refetchDirty = new Set<TableName>();
function scheduleTableRefetch(table: TableName) {
  if (refetchTimers.has(table)) {
    refetchDirty.add(table);
    return;
  }
  refetchTimers.set(
    table,
    setTimeout(() => {
      refetchTimers.delete(table);
      fetchTableRows(table)
        .then(({ rows, denied }) => {
          if (denied) return;
          if (Array.isArray(rows)) {
            applyCloudRows(table, rows);
            persistLocal();
            notify();
          }
        })
        .catch((e) => console.warn('[store] realtime refetch failed', table, e))
        .finally(() => {
          if (refetchDirty.delete(table)) scheduleTableRefetch(table);
        });
    }, 300)
  );
}

function startRealtime() {
  if (!supabase || realtimeStarted) return;
  realtimeStarted = true;
  const channel = supabase
    .channel('portfolio-realtime')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
      const table = payload?.table as TableName | undefined;
      if (!table || !ALL_TABLES.includes(table as TableName)) return;
      // Coalesced re-fetch so the UI reflects the latest server truth and every
      // open tab updates live — without a refetch storm on bulk changes.
      scheduleTableRefetch(table as TableName);
    })
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') console.warn('[store] realtime status:', status);
    });
  // keep channel referenced so it isn't GC'd — realtime relies on the subscription object
  (supabase as any).__realtimeChannel = channel;
}

/** Initialize cloud sync + realtime. Non-blocking. Call on app start. */
export function initCloud(): void {
  startRealtime();
  syncFromCloud();
}

// ---------------------------------------------------------------- Audit log
function audit(action: string, entity: string, entity_id: string, details: string) {
  const log = db.audit_logs;
  log.unshift({
    id: cryptoId(),
    action,
    entity,
    entity_id,
    details,
    created_at: new Date().toISOString(),
  });
  if (log.length > 200) log.length = 200;
}

export function cryptoId(): string {
  return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ---------------------------------------------------------------- Query API
export function select<K extends CollectionTable>(table: K): Schema[K][] {
  return clone(db[table] as Schema[K][]);
}

export function getSingleton<K extends SingletonTable>(table: K): Schema[K] {
  const arr = db[table] as Schema[K][];
  return clone(arr[0]);
}

export function upsertSingleton<K extends SingletonTable>(table: K, row: Partial<Schema[K]>) {
  const arr = db[table] as Schema[K][];
  if (arr.length === 0) {
    const fullRow = { id: cryptoId(), ...row } as Schema[K];
    arr.push(fullRow);
    pushTable('insert', table, fullRow as any);
  } else {
    arr[0] = { ...arr[0], ...row };
    pushTable('update', table, { id: (arr[0] as { id: string }).id, patch: row as any });
  }
  audit('upsert', table, (arr[0] as { id: string }).id, 'Updated ' + table);
  emit();
}

export function insert<K extends CollectionTable>(
  table: K,
  row: Omit<Schema[K], 'id'> & { id?: string }
): Schema[K] {
  const newRow = { ...row, id: row.id ?? cryptoId() } as Schema[K];
  (db[table] as Schema[K][]).unshift(newRow);
  pushTable('insert', table, newRow as any);
  audit('insert', table, (newRow as { id: string }).id, 'Created ' + table);
  emit();
  return clone(newRow);
}

/** Local-only insert (no Supabase push). Used when the caller already wrote the
 *  row to the cloud itself and only wants the store mirrored instantly. */
export function insertLocal<K extends CollectionTable>(
  table: K,
  row: Omit<Schema[K], 'id'> & { id?: string }
): Schema[K] {
  const newRow = { ...row, id: row.id ?? cryptoId() } as Schema[K];
  (db[table] as Schema[K][]).unshift(newRow);
  emit();
  return clone(newRow);
}

export function update<K extends CollectionTable>(
  table: K,
  id: string,
  patch: Partial<Schema[K]>
): void {
  const arr = db[table] as Schema[K][];
  const idx = arr.findIndex((r) => (r as { id: string }).id === id);
  if (idx >= 0) {
    arr[idx] = { ...arr[idx], ...patch };
    pushTable('update', table, { id, patch: patch as any });
    audit('update', table, id, 'Updated ' + table);
    emit();
  }
}

export function remove<K extends CollectionTable>(table: K, id: string): void {
  const arr = db[table] as Schema[K][];
  const idx = arr.findIndex((r) => (r as { id: string }).id === id);
  if (idx >= 0) {
    arr.splice(idx, 1);
    audit('delete', table, id, 'Deleted ' + table);
    emit();
  }
  // Always push (idempotent): if a previous delete failed offline, calling
  // remove() again re-sends it even though the row is already gone locally.
  pushTable('delete', table, { id });
}

export function getCollectionOrder(table: CollectionTable): string[] {
  return [...(orderMap[table] ?? [])];
}

/** Persist a full collection order: updates the local db order, each row's
 *  local sort_order (so components like Education follow it), the client-side
 *  order map (survives sync/refresh), then best-effort writes sort_order to the
 *  cloud (works once the column exists). */
export function setCollectionOrder<K extends CollectionTable>(table: K, ids: string[]): void {
  const arr = db[table] as Schema[K][];
  const map = new Map(arr.map((r) => [(r as { id: string }).id, r]));
  const ordered: Schema[K][] = [];
  ids.forEach((id) => {
    const r = map.get(id);
    if (r) ordered.push(r);
  });
  arr.forEach((r) => { if (!ids.includes((r as { id: string }).id)) ordered.push(r); });
  ordered.forEach((r, i) => { (r as unknown as { sort_order?: number }).sort_order = i; });
  (db[table] as Schema[K][]) = ordered;
  setTableOrder(table, ordered.map((r) => (r as { id: string }).id));
  // Best-effort cloud convergence — safe to fail when a table lacks the column.
  ordered.forEach((r, i) => {
    pushTable('update', table, { id: (r as { id: string }).id, patch: { sort_order: i } as any }, undefined, true);
  });
  audit('reorder', table, 'multi', 'Reordered ' + table);
  emit();
}

export function reorder<K extends CollectionTable>(table: K, ids: string[]): void {
  const arr = db[table] as Schema[K][];
  const map = new Map(arr.map((r) => [(r as { id: string }).id, r]));
  const ordered: Schema[K][] = [];
  const changed: { id: string; order: number }[] = [];
  ids.forEach((id, i) => {
    const r = map.get(id);
    if (r) {
      if ('order' in r) {
        (r as { order: number }).order = i;
        changed.push({ id, order: i });
      }
      ordered.push(r);
    }
  });
  arr.forEach((r) => {
    if (!ids.includes((r as { id: string }).id)) ordered.push(r);
  });
  (db[table] as Schema[K][]) = ordered;
  if (changed.length) pushTable('reorder', table, changed as any);
  audit('reorder', table, 'multi', 'Reordered sections');
  emit();
}

// ---------------------------------------------------------------- Analytics
export function trackEvent(
  type: 'page_view' | 'project_view' | 'resume_download' | 'resume_view' | 'contact' | 'assistant' | 'click',
  meta = ''
) {
  const event = {
    id: cryptoId(),
    type,
    referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
    path: typeof location !== 'undefined' ? location.pathname : '/',
    meta,
    created_at: new Date().toISOString(),
  };
  db.analytics.unshift(event);
  if (db.analytics.length > 1000) db.analytics.length = 1000;

  // Update counters locally (mirror what the cloud will record).
  if (type === 'project_view' && meta) {
    const p = db.projects.find((x) => x.id === meta || x.slug === meta);
    if (p) p.views += 1;
  }
  if (type === 'resume_download') {
    if (db.resume[0]) db.resume[0].downloads = (db.resume[0].downloads ?? 0) + 1;
  }
  if (type === 'resume_view') {
    if (db.resume[0]) db.resume[0].views = (db.resume[0].views ?? 0) + 1;
  }

  if (supabase) {
    // Visitors can insert into analytics (public insert policy in schema).
    supabase.from('analytics').insert(event as any).then(({ error }) => {
      if (error) console.warn('[store] analytics insert failed (ignored)', error.message);
    });

    // Increment permanent counters using a secure Postgres function (RPC) so
    // anonymous visitors can bump view counts without table-write permissions.
    if (type === 'project_view' && meta) {
      supabase.rpc('incr_project_views', { p_slug: meta }).then(({ error }) => {
        if (error) console.warn('[store] view increment failed (ignored)', error.message);
      });
    }
    if (type === 'resume_download') {
      supabase.rpc('incr_resume_downloads', {}).then(({ error }) => {
        if (error) console.warn('[store] resume download increment failed (ignored)', error.message);
      });
    }
    if (type === 'resume_view') {
      supabase.rpc('incr_resume_views', {}).then(({ error }) => {
        if (error) console.warn('[store] resume view increment failed (ignored)', error.message);
      });
    }
  }

  emit();
}

/** Resume/project tracker with server-side visitor capture.
 *  Posts to /api/track so the analytics row carries IP + ISP + location +
 *  device model (data a browser can't see by itself), while counters bump
 *  instantly here. Falls back to a plain client-side row (timestamped, no IP)
 *  whenever the API is unreachable — e.g. plain `npm run dev`. */
export type EnrichedEventType = 'resume_download' | 'resume_view' | 'project_view';

type NavigatorUAData = { getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>> };

/** Device model/platform via User-Agent Client Hints (Chrome/Edge/Android).
 *  Safari/Firefox don't expose these — the server falls back to UA parsing. */
async function collectClientHints(): Promise<{ model?: string; platform?: string; platformVersion?: string }> {
  try {
    if (typeof navigator === 'undefined') return {};
    const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
    if (!uaData?.getHighEntropyValues) return {};
    const v = await uaData.getHighEntropyValues(['model', 'platform', 'platformVersion']);
    const out: { model?: string; platform?: string; platformVersion?: string } = {};
    for (const k of ['model', 'platform', 'platformVersion'] as const) {
      const val = v?.[k];
      if (typeof val === 'string' && val) out[k] = val;
    }
    return out;
  } catch {
    return {};
  }
}

export async function trackEnrichedEvent(type: EnrichedEventType, meta = ''): Promise<void> {
  // Optimistic counters — the visitor sees the number change immediately.
  if (type === 'project_view') {
    const p = db.projects.find((x) => x.id === meta || x.slug === meta);
    if (p) p.views += 1;
  }
  if (type === 'resume_download' && db.resume[0]) db.resume[0].downloads = (db.resume[0].downloads ?? 0) + 1;
  if (type === 'resume_view' && db.resume[0]) db.resume[0].views = (db.resume[0].views ?? 0) + 1;
  if (supabase) {
    const rpc = type === 'project_view' ? 'incr_project_views' : type === 'resume_download' ? 'incr_resume_downloads' : 'incr_resume_views';
    supabase.rpc(rpc, type === 'project_view' ? { p_slug: meta } : {}).then(({ error }) => {
      if (error) console.warn('[store] counter increment failed (ignored)', error.message);
    });
  }
  emit();

  const hints = await collectClientHints();
  try {
    const resp = await fetch('/api/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        type,
        meta,
        referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
        path: typeof location !== 'undefined' ? location.pathname : '/',
        hints,
      }),
    });
    const data: unknown = await resp.json().catch(() => null);
    if (resp.ok && data && typeof data === 'object' && (data as { ok?: boolean }).ok) return;
    throw new Error(`track ${resp.status}`);
  } catch {
    const event = {
      id: cryptoId(),
      type,
      referrer: typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
      path: typeof location !== 'undefined' ? location.pathname : '/',
      // Keep the plain project slug so legacy admin parsing still resolves it.
      meta: type === 'project_view' ? meta : '',
      created_at: new Date().toISOString(),
    };
    db.analytics.unshift(event);
    if (db.analytics.length > 1000) db.analytics.length = 1000;
    if (supabase) {
      supabase.from('analytics').insert(event).then(({ error }) => {
        if (error) console.warn('[store] analytics insert failed (ignored)', error.message);
      });
    }
    emit();
  }
}

// ---------------------------------------------------------------- Draft/Publish
export function saveDraft(sections: Schema['sections'][]): void {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ sections, savedAt: new Date().toISOString() })
    );
  } catch {
    /* ignore */
  }
}

export function loadDraft(): { sections: Schema['sections'][]; savedAt: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function publishDraft(sections: Schema['sections'][]): void {
  db.sections = clone(sections);
  audit('publish', 'sections', 'all', 'Published section layout');
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
  if (supabase) {
    // Replace the sections table in the cloud with the published layout.
    supabase.from('sections').delete().neq('id', '00000000-0000-0000-0000-000000000000').then(async () => {
      if (sections.length) {
        const { error } = await supabase!.from('sections').upsert(sections as any, { onConflict: 'id' });
        if (error) console.warn('[store] publish push failed', error.message);
      }
    });
  }
  emit();
}

// ---------------------------------------------------------------- Reset
export function resetDB() {
  db = seedData() as DB;
  db._v = syncSuccessCount + 1;
  db._updatedAt = new Date().toISOString();
  if (supabase && isAuthenticated()) {
    pushAllTables().then(() => emit());
  }
  emit();
}

// ---------------------------------------------------------------- Auth (Supabase)
export interface Session {
  email: string;
  loggedAt: string;
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'Backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: error?.message ?? 'Invalid credentials.' };
  }
  const session: Session = { email: data.user.email ?? email, loggedAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  audit('login', 'auth', 'admin', 'Admin signed in');
  emit();
  // Pull the full dataset (incl. private tables) for this session.
  syncFromCloud();
  return { error: null };
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
  if (supabase) {
    supabase.auth.signOut().catch(() => {});
  }
  audit('logout', 'auth', 'admin', 'Admin signed out');
  emit();
}

export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Backend not configured.' };
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin/reset`,
    });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to send reset email.' };
  }
}

export async function updatePassword(newPassword: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Backend not configured.' };
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update password.' };
  }
}

export function getPersistError(): string | null {
  // Force any deferred write so the caller sees an up-to-date quota error.
  if (persistTimer) flushPersist();
  return lastPersistError;
}