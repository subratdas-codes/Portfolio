import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, KeyRound, Eye, EyeOff, CheckCircle2, Loader2, ArrowRight, AlertTriangle, LogIn } from 'lucide-react';
import { supabase, isSupabaseConfigured, getAuthMemory, onAuthMemoryChange } from '../../lib/supabase';
import { updatePassword } from '../../lib/store';

function urlLooksLikeRecovery(): boolean {
  const q = new URLSearchParams(document.location.search);
  const h = document.location.hash;
  return q.get('type') === 'recovery'
    || h.includes('type=recovery')
    || h.includes('access_token')
    || q.has('code');
}

export function ResetPassword() {
  const navigate = useNavigate();
  // The recovery session may already be materialized (or the URL still contains
  // the OAuth/recovery tokens). Detect it synchronously on first render.
  const mem = getAuthMemory();
  const [recovering, setRecovering] = useState<boolean>(() =>
    Boolean((mem.event === 'PASSWORD_RECOVERY' || mem.hasSession) && (mem.at > 0 || urlLooksLikeRecovery())) || urlLooksLikeRecovery()
  );
  const [checking, setChecking] = useState<boolean>(() =>
    Boolean(supabase && isSupabaseConfigured) && !((mem.event === 'PASSWORD_RECOVERY' || mem.hasSession) && (mem.at > 0 || urlLooksLikeRecovery()))
  );
  const [error, setError] = useState(() =>
    (!supabase || !isSupabaseConfigured) ? 'Backend not configured. Cannot reset password.' : ''
  );
  const [info, setInfo] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const subRef = useRef<{ subscription: { unsubscribe: () => void } } | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!supabase || !isSupabaseConfigured) {
      return;
    }
    // supabase-js may fire PASSWORD_RECOVERY during boot (before this page
    // mounts) — pick that up from the module memory, then keep listening.
    const onMem = () => {
      const m = getAuthMemory();
      if (m.event === 'PASSWORD_RECOVERY' || m.hasSession) {
        setRecovering(true);
        setChecking(false);
      }
    };
    if (getAuthMemory().event === 'PASSWORD_RECOVERY' || getAuthMemory().hasSession) onMem();
    unsubRef.current = onAuthMemoryChange(onMem);

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        setRecovering(true);
        setChecking(false);
      }
    });
    subRef.current = data;

    // Exchange any PKCE /recovery tokens still in the URL and materialize the
    // session so updateUser() has an authenticated user.
    const sb = supabase;
    const params = new URLSearchParams(document.location.search);
    const code = params.get('code');
    const qType = params.get('type');
    const codePromise: Promise<unknown> =
      (code && qType === 'recovery') ? sb.auth.exchangeCodeForSession(code) : Promise.resolve(undefined);

    codePromise
      .then(() => sb.auth.getSession())
      .then(({ data: sd }) => {
        if (!mountedRef.current) return;
        if (sd.session) { setRecovering(true); setChecking(false); }
        else { setChecking(false); }
      })
      .catch(() => { if (mountedRef.current) setChecking(false); });

    return () => {
      mountedRef.current = false;
      subRef.current?.subscription.unsubscribe();
      unsubRef.current?.();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (pw !== pw2) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    setInfo('');
    const { error } = await updatePassword(pw);
    setLoading(false);
    if (error) { setError(error); return; }
    setDone(true);
    setInfo('Password updated successfully. Sign in with your new password.');
    history.replaceState(null, '', '/admin/reset');
    setTimeout(() => navigate('/admin/login'), 1600);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-cyan-950" />
      <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400">
            <ShieldCheck size={28} className="text-white" />
          </div>
          {done ? (
            <h1 className="text-2xl font-bold text-emerald-300">Password Updated</h1>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">{recovering ? 'Set a New Password' : 'Reset Password'}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {recovering ? 'Choose a new password for your admin account' : 'Verifying your reset link…'}
              </p>
            </>
          )}
        </div>

        {done ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <CheckCircle2 size={18} /> <span>{info}</span>
          </div>
        ) : recovering ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">New Password</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-white outline-none focus:border-indigo-400" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Confirm Password</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type={show ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-white outline-none focus:border-indigo-400" />
              </div>
            </div>

            {error && <div className="rounded-lg bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>}

            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02] disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : <>Update Password <ArrowRight size={16} /></>}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            {error ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
              </div>
            ) : checking ? (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Verifying your reset link…
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>This reset link is invalid or has expired. Please request a new one.</span>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
              <LogIn size={15} /> <Link to="/admin/login" className="text-indigo-300 hover:underline">Go to login</Link>
              <span className="text-slate-600">·</span>
              <Link to="/admin/forgot" className="text-indigo-300 hover:underline">Request a new link</Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}