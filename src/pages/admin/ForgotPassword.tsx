import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { useSession } from '../../hooks/useStore';
import { requestPasswordReset } from '../../lib/store';

export function ForgotPassword() {
  const session = useSession();
  const [email, setEmail] = useState('subratdas219@gmail.com');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/admin" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    const { error } = await requestPasswordReset(email);
    if (error) { setError(error); setLoading(false); return; }
    setInfo(`If an account exists for ${email.trim()}, a password reset link has been sent. Check your inbox (and spam).`);
    setLoading(false);
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
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="mt-1 text-sm text-slate-400">We'll email you a link to set a new password</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-white outline-none focus:border-indigo-400" />
            </div>
          </div>

          {error && <div className="rounded-lg bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</div>}
          {info && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>{info}</span>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02] disabled:opacity-60">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Sending link…</> : <>Send Reset Link <ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <Link to="/admin/login" className="transition hover:text-indigo-300">← Back to login</Link>
        </div>
      </motion.div>
    </div>
  );
}