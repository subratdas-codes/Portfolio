// ============================================================================
// Data Store — reactive data layer with CLOUD SYNC.
//
// Architecture:
//   1. On load: read from localStorage cache (instant display)
//   2. Background: async-fetch from cloud (textdb.online), update if newer
//   3. On writes: localStorage immediately + debounced cloud push
//
// This means: admin edits on laptop → pushed to cloud → mobile user gets
// updated data on next load/refresh. All devices share the same cloud DB.
//
// The API mirrors Supabase (`from(table).select/insert/update/delete`) so the
// backend can be swapped to real Supabase by replacing this file + cloud.ts.
// ============================================================================

import type { Schema, TableName, CollectionTable, SingletonTable } from './types';
import { seedData } from './seed';
import { fetchCloud, pushCloud } from './cloud';

const STORAGE_KEY = 'subrat_portfolio_db_v9';
const SESSION_KEY = 'subrat_portfolio_session_v1';
const DRAFT_KEY = 'subrat_portfolio_draft_v1';

type Listener = () => void;

export type DB = { [K in TableName]: Schema[K][] } & { _v?: number; _updatedAt?: string };

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function loadDB(): DB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DB;
      if (parsed && parsed.profile && parsed.sections) return parsed;
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

let cloudWriteTimer: ReturnType<typeof setTimeout> | null = null;
let isCloudSyncing = false;
let cloudVersion = db._v ?? 0;
let lastPersistError: string | null = null;
let lastCloudError: string | null = null;
let cloudWriteInProgress = false;

function persistLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    lastPersistError = null;
  } catch (e) {
    lastPersistError = e instanceof Error ? e.message : 'Storage quota exceeded';
    console.warn('[store] Local persist failed:', lastPersistError);
  }
}

function scheduleCloudWrite() {
  if (cloudWriteTimer) clearTimeout(cloudWriteTimer);
  cloudWriteTimer = setTimeout(async () => {
    if (cloudWriteInProgress) {
      // Retry shortly
      cloudWriteTimer = setTimeout(() => scheduleCloudWrite(), 2000);
      return;
    }
    cloudWriteInProgress = true;
    cloudVersion += 1;
    db._v = cloudVersion;
    db._updatedAt = new Date().toISOString();
    persistLocal();
    const ok = await pushCloud(db);
    if (!ok) {
      lastCloudError = 'Cloud sync failed — changes saved locally only.';
      console.warn('[store] Cloud push failed');
    } else {
      lastCloudError = null;
    }
    cloudWriteInProgress = false;
    listeners.forEach((l) => l());
  }, 800);
}

function emit(pushToCloud = true) {
  persistLocal();
  if (pushToCloud) scheduleCloudWrite();
  listeners.forEach((l) => l());
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

export function resetDB() {
  db = seedData() as DB;
  db._v = cloudVersion + 1;
  db._updatedAt = new Date().toISOString();
  emit();
}

// ---------------------------------------------------------------- Cloud sync
export async function syncFromCloud(): Promise<void> {
  if (isCloudSyncing) return;
  isCloudSyncing = true;
  try {
    const cloud = await fetchCloud();
    if (cloud && cloud.profile && cloud.sections) {
      const cloudV = cloud._v ?? 0;
      if (cloudV > cloudVersion) {
        cloudVersion = cloudV;
        db = cloud as DB;
        persistLocal();
        listeners.forEach((l) => l());
        console.log('[store] Synced from cloud v' + cloudV);
      }
    } else {
      console.log('[store] Cloud empty — initializing with local data');
      cloudVersion = (db._v ?? 0) + 1;
      db._v = cloudVersion;
      db._updatedAt = new Date().toISOString();
      persistLocal();
      await pushCloud(db);
    }
  } catch (e) {
    console.warn('[store] Cloud sync error:', e);
  } finally {
    isCloudSyncing = false;
  }
}

export function startCloudPolling(intervalMs = 15000): () => void {
  const timer = setInterval(() => {
    syncFromCloud();
  }, intervalMs);
  return () => clearInterval(timer);
}

export function getSyncStatus(): { cloudError: string | null; localError: string | null; version: number; syncing: boolean } {
  return { cloudError: lastCloudError, localError: lastPersistError, version: cloudVersion, syncing: isCloudSyncing };
}

/** Force an immediate cloud push (bypasses debounce). */
export async function forceCloudSync(): Promise<boolean> {
  if (cloudWriteTimer) clearTimeout(cloudWriteTimer);
  cloudVersion += 1;
  db._v = cloudVersion;
  db._updatedAt = new Date().toISOString();
  persistLocal();
  cloudWriteInProgress = true;
  const ok = await pushCloud(db);
  cloudWriteInProgress = false;
  if (!ok) lastCloudError = 'Cloud sync failed.';
  else lastCloudError = null;
  listeners.forEach((l) => l());
  return ok;
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
    arr.push({ id: cryptoId(), ...row } as Schema[K]);
  } else {
    arr[0] = { ...arr[0], ...row };
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
  audit('insert', table, (newRow as { id: string }).id, 'Created ' + table);
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
}

export function reorder<K extends CollectionTable>(table: K, ids: string[]): void {
  const arr = db[table] as Schema[K][];
  const map = new Map(arr.map((r) => [(r as { id: string }).id, r]));
  const ordered: Schema[K][] = [];
  ids.forEach((id, i) => {
    const r = map.get(id);
    if (r) {
      if ('order' in r) (r as { order: number }).order = i;
      ordered.push(r);
    }
  });
  arr.forEach((r) => {
    if (!ids.includes((r as { id: string }).id)) ordered.push(r);
  });
  (db[table] as Schema[K][]) = ordered;
  audit('reorder', table, 'multi', 'Reordered sections');
  emit();
}

// ---------------------------------------------------------------- Analytics
export function trackEvent(
  type: 'page_view' | 'project_view' | 'resume_download' | 'contact' | 'assistant' | 'click',
  meta = ''
) {
  db.analytics.unshift({
    id: cryptoId(),
    type,
    referrer: document.referrer || 'direct',
    path: location.pathname,
    meta,
    created_at: new Date().toISOString(),
  });
  if (db.analytics.length > 1000) db.analytics.length = 1000;
  if (type === 'project_view' && meta) {
    const p = db.projects.find((x) => x.id === meta || x.slug === meta);
    if (p) p.views += 1;
  }
  if (type === 'resume_download') {
    if (db.resume[0]) db.resume[0].downloads += 1;
  }
  // Analytics sync to cloud but with lighter debounce
  emit();
}

// ---------------------------------------------------------------- Draft/Publish
export interface DraftState {
  sections: Schema['sections'][];
  savedAt: string;
}

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

export function loadDraft(): DraftState | null {
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
  emit();
}

// ---------------------------------------------------------------- Auth
const ADMIN_EMAIL = 'admin@subrat.dev';
const ADMIN_PASSWORD = 'admin123';

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

export function signIn(email: string, password: string): { error: string | null } {
  if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const session: Session = { email: ADMIN_EMAIL, loggedAt: new Date().toISOString() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    audit('login', 'auth', 'admin', 'Admin signed in');
    emit();
    return { error: null };
  }
  return { error: 'Invalid credentials. Use admin@subrat.dev / admin123' };
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
  audit('logout', 'auth', 'admin', 'Admin signed out');
  emit();
}

export function resetPassword(email: string): { error: string | null } {
  if (email.trim().toLowerCase() === ADMIN_EMAIL) {
    return { error: null };
  }
  return { error: 'No account found for that email.' };
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function getPersistError(): string | null {
  return lastPersistError;
}

/** Initialize cloud sync — call on app start. Non-blocking. */
export function initCloud(): void {
  syncFromCloud();
}
