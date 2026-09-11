import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, Download, MessageSquare, FolderGit2, Mail, TrendingUp, Bot,
  Users, Star, Clock, ArrowRight, FileText, Award, Cloud,
} from 'lucide-react';
import { useCollection, useSingleton } from '../../hooks/useStore';
import { getDB, getSyncStatus } from '../../lib/store';

export function Dashboard() {
  const messages = useCollection('contact_messages');
  const projects = useCollection('projects');
  const resume = useSingleton('resume');
  const analytics = useCollection('analytics');
  const profile = useSingleton('profile');
  const db = getDB();

  const unread = messages.filter((m) => !m.read).length;
  const projectViews = projects.reduce((s, p) => s + p.views, 0);
  const pageViews = analytics.filter((a) => a.type === 'page_view').length;
  const resumeDls = resume.downloads;
  const assistantUses = analytics.filter((a) => a.type === 'assistant').length;

  const stats = [
    { label: 'Page Views', value: pageViews, icon: Eye, color: 'from-indigo-500 to-blue-500', to: '/admin/analytics' },
    { label: 'Project Views', value: projectViews, icon: FolderGit2, color: 'from-cyan-500 to-teal-500', to: '/admin/analytics' },
    { label: 'Resume Downloads', value: resumeDls, icon: Download, color: 'from-emerald-500 to-green-500', to: '/admin/analytics' },
    { label: 'Unread Messages', value: unread, icon: Mail, color: 'from-amber-500 to-orange-500', to: '/admin/messages' },
    { label: 'Assistant Chats', value: assistantUses, icon: Bot, color: 'from-violet-500 to-fuchsia-500', to: '/admin/analytics' },
    { label: 'Total Projects', value: projects.length, icon: FileText, color: 'from-rose-500 to-pink-500', to: '/admin/projects' },
  ];

  const quickLinks = [
    { to: 'profile', label: 'Edit Profile', icon: Users },
    { to: 'projects', label: 'Manage Projects', icon: FolderGit2 },
    { to: 'page-builder', label: 'Page Builder', icon: Star },
    { to: 'messages', label: 'Read Messages', icon: Mail },
    { to: 'settings', label: 'SEO & Theme', icon: Award },
  ];

  // Build last-7-days chart data
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const dailyCounts = days.map((day) => analytics.filter((a) => a.created_at.slice(0, 10) === day).length);
  const maxCount = Math.max(...dailyCounts, 1);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Welcome back, {profile.name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-slate-400">Here's what's happening with your portfolio.</p>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-5 py-3">
        <Cloud size={18} className="text-emerald-400" />
        <div>
          <p className="text-sm font-medium text-emerald-300">Cloud Sync Active</p>
          <p className="text-xs text-slate-400">All changes you make here are automatically synced to the cloud. Visitors on any device will see updates within 20 seconds of refreshing.</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={s.to} className="group relative block h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-indigo-400/40 hover:bg-white/10">
              <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.color} opacity-20 blur-2xl`} />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-sm text-slate-400">{s.label}</div>
                </div>
                <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${s.color}`}><s.icon size={22} className="text-white" /></div>
              </div>
              <ArrowRight size={14} className="absolute bottom-4 right-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-indigo-300" />
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-400" /><h3 className="font-semibold text-white">Activity (Last 7 Days)</h3></div>
          <div className="flex h-40 items-end gap-2">
            {dailyCounts.map((c, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <motion.div className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-cyan-400" initial={{ height: 0 }} animate={{ height: `${(c / maxCount) * 100}%` }} transition={{ delay: i * 0.08, duration: 0.6 }} style={{ minHeight: c > 0 ? '8px' : '2px' }} />
                <span className="text-xs text-slate-500">{new Date(days[i]).toLocaleDateString('en', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center gap-2"><Clock size={18} className="text-cyan-400" /><h3 className="font-semibold text-white">Recent Messages</h3></div>
          <div className="space-y-3">
            {messages.slice(0, 4).map((m) => (
              <Link key={m.id} to="/admin/messages" state={{ openMessage: m.id }} className="block rounded-lg bg-white/5 p-3 transition hover:bg-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{m.name}</span>
                  {!m.read && <span className="h-2 w-2 rounded-full bg-rose-400" />}
                </div>
                <p className="truncate text-xs text-slate-400">{m.subject || m.message}</p>
              </Link>
            ))}
            {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 font-semibold text-white">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {quickLinks.map((q) => (
            <Link key={q.to} to={'/admin/' + q.to} className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-indigo-400/40 hover:bg-white/10">
              <span className="flex items-center gap-2 text-sm font-medium text-white"><q.icon size={16} className="text-indigo-400" /> {q.label}</span>
              <ArrowRight size={14} className="text-slate-500 transition group-hover:translate-x-1 group-hover:text-indigo-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
