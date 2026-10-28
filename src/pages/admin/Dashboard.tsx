import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, Download, FolderGit2, Mail, TrendingUp, Bot,
  Users, Star, Clock, ArrowRight, FileText, Award, Cloud, Trash2,
} from 'lucide-react';
import { useCollection, useSingleton } from '../../hooks/useStore';
import { remove, syncFromCloud } from '../../lib/store';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Modal } from '../../components/ui/Modal';
import { parseVisitorMeta, describeClient, describeLocation } from '../../lib/visitor';

type ActivityType = 'page_view' | 'resume_download' | 'resume_view' | 'project_view';

export function Dashboard() {
  const messages = useCollection('contact_messages');
  const projects = useCollection('projects');
  const resume = useSingleton('resume');
  const analytics = useCollection('analytics');
  const profile = useSingleton('profile');
  const [activity, setActivity] = useState<ActivityType | null>(null);
  const [expanded, setExpanded] = useState(false);

  // While a details modal is open, pull fresh analytics every 5s so new
  // downloads/views appear live without closing the modal.
  useEffect(() => {
    if (!activity) return;
    syncFromCloud();
    const timer = setInterval(() => syncFromCloud(), 5000);
    return () => clearInterval(timer);
  }, [activity]);

  const unread = messages.filter((m) => !m.read).length;
  const projectViews = projects.reduce((s, p) => s + p.views, 0);
  const pageViews = analytics.filter((a) => a.type === 'page_view').length;
  const resumeDls = resume.downloads;
  const resumeViews = resume.views;
  const assistantUses = analytics.filter((a) => a.type === 'assistant').length;

  const stats: { label: string; value: number; icon: typeof Eye; color: string; to: string; activity?: ActivityType }[] = [
    { label: 'Page Views', value: pageViews, icon: Eye, color: 'from-indigo-500 to-blue-500', to: '/admin/analytics', activity: 'page_view' },
    { label: 'Project Views', value: projectViews, icon: FolderGit2, color: 'from-cyan-500 to-teal-500', to: '/admin/analytics', activity: 'project_view' },
    { label: 'Resume Views', value: resumeViews, icon: Eye, color: 'from-violet-500 to-purple-500', to: '/admin/analytics', activity: 'resume_view' },
    { label: 'Resume Downloads', value: resumeDls, icon: Download, color: 'from-emerald-500 to-green-500', to: '/admin/analytics', activity: 'resume_download' },
    { label: 'Unread Messages', value: unread, icon: Mail, color: 'from-amber-500 to-orange-500', to: '/admin/messages' },
    { label: 'Assistant Chats', value: assistantUses, icon: Bot, color: 'from-rose-500 to-pink-500', to: '/admin/analytics' },
    { label: 'Total Projects', value: projects.length, icon: FileText, color: 'from-cyan-500 to-teal-500', to: '/admin/projects' },
  ];

  const titleBySlug = new Map(projects.map((p) => [p.slug, p.title]));
  const titleById = new Map(projects.map((p) => [p.id, p.title]));
  const activityRows = activity
    ? analytics
        .filter((a) => a.type === activity)
        .slice()
        .sort((a, b) => (b.created_at < a.created_at ? -1 : 1))
        .slice(0, 100)
        .map((e) => {
          const info = parseVisitorMeta(e.meta);
          const slug = info.project || e.meta;
          return {
            ...e,
            info,
            project: activity === 'project_view' ? titleBySlug.get(slug) || titleById.get(slug) || slug || 'Unknown' : '',
            device: describeClient(info),
            location: describeLocation(info),
          };
        })
    : [];

  const activityTitle = activity === 'page_view' ? 'Who Visited the Site'
    : activity === 'project_view' ? 'Who Viewed Projects'
    : activity === 'resume_view' ? 'Who Viewed the Resume'
    : 'Who Downloaded the Resume';
  const ACTIVITY_PAGE = 15;
  const visibleActivityRows = expanded ? activityRows : activityRows.slice(0, ACTIVITY_PAGE);

  const [deleting, setDeleting] = useState(false);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const toggleHighlight = (id: string) => {
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const deleteEvent = async (id: string) => {
    if (!window.confirm('Delete this analytics entry?')) return;
    setDeleting(true);
    remove('analytics', id);
    if (supabase && isSupabaseConfigured) {
      const url = (supabase as any).supabaseUrl;
      const key = (supabase as any).supabaseKey;
      try {
        await fetch(`${url}/rest/v1/analytics?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=representation' }
        });
      } catch {}
      try { await supabase.from('analytics').delete().eq('id', id); } catch {}
      try { await supabase.rpc('delete_analytics', { p_id: id }); } catch {}
    }
    try { await syncFromCloud(); } catch {}
    try { await new Promise(r=>setTimeout(r,300)); await syncFromCloud(); } catch {}
    try { await new Promise(r=>setTimeout(r,300)); await syncFromCloud(); } catch {}
    setDeleting(false);
  };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (visibleActivityRows.length === 0) return;
    const allVisibleSelected = visibleActivityRows.every((r) => selected.has(r.id));
    if (allVisibleSelected && selected.size > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleActivityRows.map((r) => r.id)));
    }
  };
  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected analytics entries?`)) return;
    setDeleting(true);
    const ids = Array.from(selected);
    for (const id of ids) {
      remove('analytics', id);
      if (supabase && isSupabaseConfigured) {
        try { await supabase.from('analytics').delete().eq('id', id); } catch {}
        try { await supabase.rpc('delete_analytics', { p_id: id }); } catch {}
      }
    }
    setSelected(new Set());
    try { await syncFromCloud(); } catch {}
    try { await new Promise(r=>setTimeout(r,300)); await syncFromCloud(); } catch {}
    try { await new Promise(r=>setTimeout(r,300)); await syncFromCloud(); } catch {}
    setDeleting(false);
  };

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
        {stats.map((s, i) => {
          const card = (
            <>
              <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.color} opacity-20 blur-2xl`} />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-sm text-slate-400">{s.label}</div>
                </div>
                <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${s.color}`}><s.icon size={22} className="text-white" /></div>
              </div>
              <ArrowRight size={14} className="absolute bottom-4 right-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-indigo-300" />
            </>
          );
          const cls = 'group relative block h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-indigo-400/40 hover:bg-white/10';
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              {s.activity ? (
                <button type="button" onClick={() => { setExpanded(false); setActivity(s.activity!); }} className={cls}>{card}</button>
              ) : (
                <Link to={s.to} className={cls}>{card}</Link>
              )}
            </motion.div>
          );
        })}
      </div>

      <Modal open={!!activity} onClose={() => { setActivity(null); setSelected(new Set()); setExpanded(false); }} title={activityTitle} maxWidth="max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {activityRows.length} recorded {activity === 'project_view' ? 'project opens' : activity === 'resume_view' ? 'resume views' : activity === 'page_view' ? 'site visits' : 'resume downloads'}, newest first.
          </p>
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <button disabled={deleting} onClick={deleteSelected} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50">
                <Trash2 size={12} /> {deleting ? 'Deleting...' : `Delete selected (${selected.size})`}
              </button>
            )}
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live · refreshes every 5s
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-3 font-medium">
                  <input type="checkbox" checked={visibleActivityRows.length > 0 && visibleActivityRows.every((r) => selected.has(r.id))} onChange={toggleSelectAll} className="rounded border-white/20 bg-white/5" />
                </th>
                {activity === 'project_view' && <th className="py-2 pr-4 font-medium">Project</th>}
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">IP</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">Device</th>
                {activity !== 'project_view' && <th className="py-2 pr-4 font-medium">ISP</th>}
                <th className="py-2 pr-2 font-medium">Source (How they found you)</th>
                <th className="py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleActivityRows.map((e) => (
                <tr key={e.id} onClick={() => toggleHighlight(e.id)} className={`cursor-pointer border-b border-white/5 text-slate-300 ${highlighted.has(e.id) ? 'bg-amber-500/10' : selected.has(e.id) ? 'bg-rose-500/5' : ''}`}>
                  <td className="py-2 pr-3"><input type="checkbox" checked={selected.has(e.id)} onChange={(ev) => { ev.stopPropagation(); toggleSelect(e.id); }} className="rounded border-white/20 bg-white/5" /></td>
                  {activity === 'project_view' && <td className="py-2 pr-4 font-medium text-white">{e.project}</td>}
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-400">{new Date(e.created_at).toLocaleString('en-GB')}</td>
                  <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs text-slate-400">{e.info.ip || '—'}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-400">{e.location || '—'}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-400">{e.device}</td>
                  {activity !== 'project_view' && <td className="max-w-[160px] truncate py-2 pr-4 text-slate-500">{e.info.isp || '—'}</td>}
                  <td className="max-w-[180px] truncate py-2 pr-2 text-slate-500">{e.referrer}</td>
                  <td className="py-2 text-right"><button disabled={deleting} onClick={(ev) => { ev.stopPropagation(); deleteEvent(e.id); }} className="rounded p-1 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50" title="Delete this entry"><Trash2 size={14} /></button></td>
                </tr>
              ))}
              {activityRows.length === 0 && (
                <tr><td colSpan={activity === 'project_view' ? 9 : 10} className="py-8 text-center text-slate-500">Nothing recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {activityRows.length > ACTIVITY_PAGE && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-400/40 hover:bg-white/10 hover:text-white"
            >
              {expanded ? 'Show less' : `See more (${activityRows.length - ACTIVITY_PAGE} more)`}
            </button>
          </div>
        )}
      </Modal>

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
