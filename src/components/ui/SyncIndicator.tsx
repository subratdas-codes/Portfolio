import { useState, useEffect } from 'react';
import { Cloud, CloudOff, Check, Loader2, RefreshCw } from 'lucide-react';
import { getSyncStatus, forceCloudSync, syncFromCloud } from '../../lib/store';

/** Floating indicator showing cloud sync status. Always visible briefly on load,
 *  shows errors persistently, and has a manual sync button. */
export function SyncIndicator() {
  const [status, setStatus] = useState(getSyncStatus());
  const [visible, setVisible] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(getSyncStatus());
    }, 2000);
    // Hide after 4 seconds if no error
    const hideTimer = setTimeout(() => {
      if (!getSyncStatus().cloudError) setVisible(false);
    }, 4000);
    return () => { clearInterval(interval); clearTimeout(hideTimer); };
  }, []);

  const manualSync = async () => {
    setSyncing(true);
    await syncFromCloud();
    setStatus(getSyncStatus());
    setSyncing(false);
    setVisible(true);
    setTimeout(() => { if (!getSyncStatus().cloudError) setVisible(false); }, 3000);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 backdrop-blur">
      {status.cloudError ? (
        <>
          <CloudOff size={14} className="text-amber-400" />
          <span>Local only</span>
        </>
      ) : syncing ? (
        <>
          <Loader2 size={14} className="animate-spin text-cyan-400" />
          <span>Syncing…</span>
        </>
      ) : (
        <>
          <Check size={14} className="text-emerald-400" />
          <span>Synced</span>
        </>
      )}
      <button onClick={manualSync} className="ml-1 text-slate-500 hover:text-white" title="Sync now">
        <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
      </button>
      <button onClick={() => setVisible(false)} className="ml-0.5 text-slate-500 hover:text-white">×</button>
    </div>
  );
}
