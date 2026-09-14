import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { initCloud } from './lib/store';
import { onAuthMemoryChange, getAuthMemory } from './lib/supabase';

const PublicSite = lazy(() => import('./pages/PublicSite').then((m) => ({ default: m.PublicSite })));
const Login = lazy(() => import('./pages/admin/Login').then((m) => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('./pages/admin/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetCallback = lazy(() => import('./pages/admin/ResetCallback').then((m) => ({ default: m.ResetPassword })));
const AdminApp = lazy(() => import('./pages/AdminApp').then((m) => ({ default: m.AdminApp })));

function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    </div>
  );
}

// If the Supabase reset email link is opened while the redirect URL isn't yet
// allowlisted, it may land on any route (e.g. home). Detect the recovery
// session globally and bounce to the reset page so the password form always
// shows up.
function RecoveryRedirect() {
  const navigate = useNavigate();
  const doneRef = useRef(false);

  useEffect(() => {
    const check = () => {
      if (doneRef.current) return;
      const q = new URLSearchParams(document.location.search);
      const h = document.location.hash;
      const hasUrlTokens = q.get('type') === 'recovery'
        || h.includes('type=recovery')
        || h.includes('access_token')
        || q.has('code');
      const mem = getAuthMemory();
      const isRecovery = (mem.event === 'PASSWORD_RECOVERY' || (mem.hasSession && h.includes('type=recovery'))) && mem.at > 0;
      if (!(hasUrlTokens || isRecovery)) return;
      if (document.location.pathname !== '/admin/reset') {
        doneRef.current = true;
        navigate('/admin/reset', { replace: true });
      }
    };
    check();
    const unsub = onAuthMemoryChange(check);
    return () => unsub();
  }, [navigate]);

  return null;
}

export default function App() {
  const [cloudInitStarted, setCloudInitStarted] = useState(false);

  useEffect(() => {
    // Start cloud sync in the background — DON'T block the UI.
    // The store already loads from localStorage cache instantly (synchronously)
    // so the page renders immediately. Cloud data merges in when ready.
    if (!cloudInitStarted) {
      setCloudInitStarted(true);
      initCloud();
    }
  }, [cloudInitStarted]);

  return (
    <BrowserRouter>
      <RecoveryRedirect />
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/admin/login" element={<Suspense fallback={<FullScreenLoader />}><Login /></Suspense>} />
        <Route path="/admin/forgot" element={<Suspense fallback={<FullScreenLoader />}><ForgotPassword /></Suspense>} />
        <Route path="/admin/reset" element={<Suspense fallback={<FullScreenLoader />}><ResetCallback /></Suspense>} />
        <Route path="/admin/*" element={<Suspense fallback={<FullScreenLoader />}><AdminApp /></Suspense>} />
        <Route path="*" element={<PublicSite />} />
      </Routes>
    </BrowserRouter>
  );
}
