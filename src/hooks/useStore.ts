// ============================================================================
// useStore — reactive hooks that re-render when the data store changes.
// Cloud sync is initialized on first use.
// ============================================================================

import { useSyncExternalStore } from 'react';
import { subscribe, select, getSingleton, syncFromCloud, startCloudPolling, getSyncStatus, getDBVersion, getStatusKey } from '../lib/store';
import type { CollectionTable, SingletonTable, Schema } from '../lib/types';

let cloudInitialized = false;

function ensureCloudInit() {
  if (cloudInitialized) return;
  cloudInitialized = true;
  // Kick off cloud sync + polling
  syncFromCloud();
  startCloudPolling(15000);
}

// Cheap O(1) snapshot: a version counter + sync status key. The previous
// implementation JSON.stringify-ed the ENTIRE database on every render check,
// which froze the main thread (bad INP) once analytics/logs grew.
export function useDB() {
  ensureCloudInit();
  return useSyncExternalStore(
    subscribe,
    () => getDBVersion() + '|' + getStatusKey()
  );
}

export function useCollection<K extends CollectionTable>(table: K): Schema[K][] {
  useDB();
  return select(table);
}

export function useSingleton<K extends SingletonTable>(table: K): Schema[K] {
  useDB();
  return getSingleton(table);
}

export function useSession() {
  useDB();
  return (() => {
    try {
      const raw = localStorage.getItem('subrat_portfolio_session_v1');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
}

export function useSyncStatus() {
  useDB();
  return getSyncStatus();
}
