import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useDB } from '../../hooks/useStore';
import { getToasts } from '../../lib/store';

/** Global transient toasts (mounted once in App) — confirms save/delete/publish
 *  actions with e.g. "Skills — updated live". */
export function ToastHost() {
  useDB();
  const toasts = getToasts();
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl border border-white/10 bg-slate-900/95 px-4 py-2.5 text-sm font-medium text-white shadow-2xl backdrop-blur"
          >
            {t.tone === 'error' ? (
              <AlertTriangle size={16} className="shrink-0 text-amber-400" />
            ) : t.tone === 'info' ? (
              <Info size={16} className="shrink-0 text-cyan-400" />
            ) : (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            )}
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
