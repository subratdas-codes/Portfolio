// ============================================================================
// useStore — reactive hooks that re-render when the data store changes.
// Cloud sync is initialized on first use.
// ============================================================================

import { useSyncExternalStore, useEffect, useRef } from 'react';
import { subscribe, getDB, select, getSingleton, syncFromCloud, startCloudPolling, getSyncStatus } from '../lib/store';
import type { CollectionTable, SingletonTable, Schema } from '../lib/types';

let cloudInitialized = false;

function ensureCloudInit() {
  if (cloudInitialized) return;
  cloudInitialized = true;
  // Kick off cloud sync + polling
  syncFromCloud();
  startCloudPolling(15000);
}

// A monotonically increasing snapshot string. We append the sync status so
// components re-render when cloud errors change.
export function useDB() {
  ensureCloudInit();
  return useSyncExternalStore(
    subscribe,
    () => JSON.stringify(getDB()) + '|' + JSON.stringify(getSyncStatus())
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
