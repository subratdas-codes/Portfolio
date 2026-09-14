import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { initCloud } from './lib/store';

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
