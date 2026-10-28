import { useMemo, useState } from 'react';
import { Eye, Download, FolderGit2, Mail, Bot, Globe, TrendingUp, BarChart3, MapPin, Clock, MessageCircle, RotateCcw, AlertTriangle, Trash2 } from 'lucide-react';
import { useCollection, useSingleton } from '../../hooks/useStore';
import { remove, syncFromCloud } from '../../lib/store';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { parseVisitorMeta, describeClient, describeLocation } from '../../lib/visitor';

export function Analytics() {
  const analytics = useCollection('analytics');
  const projects = useCollection('projects');
  const resume = useSingleton('resume');
  const [resetting, setResetting] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [showAllResume, setShowAllResume] = useState(false);
  const [showAllVisitors, setShowAllVisitors] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const stats = useMemo(() => {
    const byType = (t: string) => analytics.filter((a) => a.type === t).length;
    return {
      pageViews: byType('page_view'),
      projectViews: byType('project_view'),
      resumeViews: resume.views,
      resumeDownloads: resume.downloads,
      contacts: byType('contact'),
      assistant: byType('assistant'),
    };
  }, [analytics, resume]);

  // top referrers
  const referrers = useMemo(() => {
    const map: Record<string, number> = {};
    analytics.forEach((a) => { const r = a.referrer || 'direct'; map[r] = (map[r] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [analytics]);

  // per-project "who opened": each recorded project_view event with visitor info
  const projectViewDetails = useMemo(() => {
    const titleBySlug = new Map(projects.map((p) => [p.slug, p.title]));
    const titleById = new Map(projects.map((p) => [p.id, p.title]));
    return analytics
      .filter((a) => a.type === 'project_view')
      .slice()
      .sort((a, b) => (b.created_at < a.created_at ? -1 : 1))
      .map((e) => {
        const info = parseVisitorMeta(e.meta);
        // New rows carry the slug in JSON; legacy rows have the plain slug/id.
        const slug = info.project || e.meta;
        const project = titleBySlug.get(slug) || titleById.get(slug) || slug || '(unknown project)';
        return { ...e, info, project, device: describeClient(info), location: describeLocation(info) };
      });
  }, [analytics, projects]);
  const PROJECT_PAGE = 15;
  const visibleProjectViews = showAllProjects ? projectViewDetails : projectViewDetails.slice(0, PROJECT_PAGE);

  // latest assistant questions visitors asked the chat assistant
  const assistantQuestions = useMemo(
    () => analytics.filter((a) => a.type === 'assistant').slice().sort((a, b) => (b.created_at < a.created_at ? -1 : 1)).slice(0, 20),
    [analytics]
  );

  // Who downloaded / viewed the resume: server-logged rows carry visitor JSON
  // in meta; plain client fallback rows have empty meta.
  const resumeActivity = useMemo(() => {
    return analytics
      .filter((a) => a.type === 'resume_download' || a.type === 'resume_view')
      .slice()
      .sort((a, b) => (b.created_at < a.created_at ? -1 : 1))
      .map((e) => {
        const info = parseVisitorMeta(e.meta);
        return { ...e, info, device: describeClient(info), location: describeLocation(info) };
      });
  }, [analytics]);
  const RESUME_PAGE = 15;
  const visibleResumeActivity = showAllResume ? resumeActivity : resumeActivity.slice(0, RESUME_PAGE);

  // Who visited the site: enriched page_view rows (IP, location, ISP, device).
  const visitorActivity = useMemo(() => {
    return analytics
      .filter((a) => a.type === 'page_view')
      .slice()
      .sort((a, b) => (b.created_at < a.created_at ? -1 : 1))
      .map((e) => {
        const info = parseVisitorMeta(e.meta);
        return { ...e, info, device: describeClient(info), location: describeLocation(info) };
      });
  }, [analytics]);
  const VISITOR_PAGE = 15;
  const visibleVisitors = showAllVisitors ? visitorActivity : visitorActivity.slice(0, VISITOR_PAGE);

  // last 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d.toISOString().slice(0, 10);
  });
  const daily = days.map((day) => analytics.filter((a) => a.created_at.slice(0, 10) === day).length);
  const maxDaily = Math.max(...daily, 1);

  const cards = [
    { label: 'Page Views', value: stats.pageViews, icon: Eye, color: 'from-indigo-500 to-blue-500', rpc: 'reset_page_views' },
    { label: 'Project Views', value: stats.projectViews, icon: FolderGit2, color: 'from-cyan-500 to-teal-500', rpc: 'reset_project_views' },
    { label: 'Resume Views', value: stats.resumeViews, icon: Eye, color: 'from-violet-500 to-purple-500', rpc: 'reset_resume_views' },
    { label: 'Resume Downloads', value: stats.resumeDownloads, icon: Download, color: 'from-emerald-500 to-green-500', rpc: 'reset_resume_downloads' },
    { label: 'Contact Requests', value: stats.contacts, icon: Mail, color: 'from-amber-500 to-orange-500', rpc: 'reset_contacts' },
    { label: 'Assistant Interactions', value: stats.assistant, icon: Bot, color: 'from-rose-500 to-pink-500', rpc: 'reset_assistant' },
  ];

  const doReset = async (rpc: string, label: string) => {
    if (!supabase || !isSupabaseConfigured) return;
    if (!window.confirm(`Reset "${label}" to zero? This cannot be undone.`)) return;
    setResetting(rpc);
    setResetMsg(null);
    try {
      const { error } = await supabase.rpc(rpc);
      if (error) throw error;
      await syncFromCloud();
      setResetMsg(`"${label}" has been reset to zero.`);
    } catch (e) {
      setResetMsg(`Reset failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
    setResetting(null);
    setTimeout(() => setResetMsg(null), 3000);
  };

  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
      try {
        const { error } = await supabase.from('analytics').delete().eq('id', id);
        if (error) {
          try { await supabase.rpc('delete_analytics', { p_id: id }); } catch {}
        }
      } catch {
        try { await supabase.rpc('delete_analytics', { p_id: id }); } catch {}
      }
    }
    try { await syncFromCloud(); } catch {}
    setDeleting(false);
  };
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (rows: Array<{id:string}>) => {
    if (rows.length === 0) return;
    const all = rows.every((r) => selected.has(r.id));
    if (all && selected.size > 0) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const deleteSelected = async (rows: Array<{id:string}>) => {
    const ids = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected analytics entries?`)) return;
    setDeleting(true);
    for (const id of ids) {
      remove('analytics', id);
      if (supabase && isSupabaseConfigured) {
        try { await supabase.from('analytics').delete().eq('id', id); } catch {}
        try { await supabase.rpc('delete_analytics', { p_id: id }); } catch {}
      }
    }
    setSelected(new Set());
    try { await syncFromCloud(); } catch {}
    setDeleting(false);
  };

  const resetAll = async () => {
    if (!window.confirm('Reset ALL analytics counters (page views, project views, resume views, resume downloads, contacts, assistant)? This cannot be undone.')) return;
    setResetting('all');
    setResetMsg(null);
    try {
      const { error } = await supabase!.rpc('reset_all_counters');
      if (error) throw error;
      await syncFromCloud();
      setResetMsg('All analytics counters have been reset to zero.');
    } catch (e) {
      setResetMsg(`Reset failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    }
    setResetting(null);
    setTimeout(() => setResetMsg(null), 3000);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><BarChart3 size={24} className="text-indigo-400" /> Analytics</h1>
          <p className="text-sm text-slate-400">Visitor statistics and engagement metrics.</p>
        </div>
        <button onClick={resetAll} disabled={!!resetting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-60">
          <RotateCcw size={15} className={resetting === 'all' ? 'animate-spin' : ''} /> Reset All Counters
        </button>
      </div>

      {resetMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"><AlertTriangle size={16} /> {resetMsg}</div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="relative rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${c.color}`}><c.icon size={18} className="text-white" /></div>
            <div className="text-2xl font-bold text-white">{c.value}</div>
            <div className="text-xs text-slate-400">{c.label}</div>
            <button onClick={() => doReset(c.rpc, c.label)} disabled={!!resetting} title={`Reset ${c.label} to zero`}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-rose-400 disabled:opacity-50">
              <RotateCcw size={14} className={resetting === c.rpc ? 'animate-spin' : ''} />
            </button>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-400" /><h3 className="font-semibold text-white">Traffic (Last 14 Days)</h3></div>
          <div className="flex h-48 items-end gap-1.5">
            {daily.map((c, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-cyan-400" style={{ height: `${(c / maxDaily) * 100}%`, minHeight: c > 0 ? '6px' : '2px' }} title={`${c} events`} />
                <span className="text-[10px] text-slate-600">{i % 2 === 0 ? new Date(days[i]).getDate() : ''}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center gap-2"><Globe size={18} className="text-cyan-400" /><h3 className="font-semibold text-white">Top Referrers</h3></div>
          <div className="space-y-3">
            {referrers.map(([r, count]) => (
              <div key={r} className="flex items-center justify-between text-sm">
                <span className="truncate text-slate-300">{r}</span>
                <span className="font-semibold text-white">{count}</span>
              </div>
            ))}
            {referrers.length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-white"><Globe size={16} className="text-indigo-400" /> Who Visited the Site</h3>
          <div className="flex items-center gap-2">{selected.size > 0 && <button disabled={deleting} onClick={() => deleteSelected(visibleVisitors)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"><Trash2 size={12} />{deleting ? 'Deleting...' : `Delete selected (${selected.size})`}</button>}<span className="text-xs text-slate-500">{stats.pageViews} visits total</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-3 font-medium"><input type="checkbox" checked={visibleVisitors.length > 0 && visibleVisitors.every(r => selected.has(r.id))} onChange={() => toggleSelectAll(visibleVisitors)} className="rounded border-white/20 bg-white/5" /></th>
                <th className="py-2 pr-4 font-medium"><Clock size={11} className="inline" /> When</th>
                <th className="py-2 pr-4 font-medium">IP Address</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="hidden py-2 pr-4 font-medium md:table-cell">Device</th>
                <th className="hidden py-2 pr-4 font-medium lg:table-cell">ISP</th>
                <th className="hidden py-2 pr-4 font-medium xl:table-cell">Page</th>
                <th className="py-2 pr-2 font-medium">Referred From</th>
                <th className="py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleVisitors.map((e, i) => (
                <tr key={e.id} onClick={() => toggleHighlight(e.id)} className={`cursor-pointer border-b border-white/5 text-slate-300 ${highlighted.has(e.id) ? 'bg-amber-500/10' : selected.has(e.id) ? 'bg-rose-500/5' : i === 0 ? 'bg-indigo-500/10' : ''}`}>
                  <td className="py-2 pr-3"><input type="checkbox" checked={selected.has(e.id)} onChange={(ev) => { ev.stopPropagation(); toggleSelect(e.id); }} className="rounded border-white/20 bg-white/5" /></td>
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-400">{new Date(e.created_at).toLocaleString('en-GB')}</td>
                  <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs text-slate-400">{e.info.ip || '—'}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-400">{e.location || '—'}</td>
                  <td className="hidden whitespace-nowrap py-2 pr-4 text-slate-500 md:table-cell">{e.device}</td>
                  <td className="hidden max-w-[160px] truncate py-2 pr-4 text-slate-500 lg:table-cell">{e.info.isp || '—'}</td>
                  <td className="hidden max-w-[140px] truncate py-2 pr-4 text-slate-500 xl:table-cell">{e.path}</td>
                  <td className="max-w-[180px] truncate py-2 pr-2 text-slate-500">{e.referrer}</td>
                  <td className="py-2 text-right">
                    <button disabled={deleting} onClick={(ev) => { ev.stopPropagation(); deleteEvent(e.id); }} className="rounded p-1 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50" title="Delete this entry"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {visitorActivity.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-slate-500">No site visits recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {visitorActivity.length > VISITOR_PAGE && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowAllVisitors((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-400/40 hover:bg-white/10 hover:text-white"
            >
              {showAllVisitors ? 'Show less' : `See more (${visitorActivity.length - VISITOR_PAGE} more)`}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 font-semibold text-white">Project View Counts</h3>
        <div className="space-y-3">
          {projects.map((p) => {
            const max = Math.max(...projects.map((x) => x.views), 1);
            return (
              <div key={p.id}>
                <div className="mb-1 flex justify-between text-sm"><span className="text-slate-300">{p.title}</span><span className="text-slate-400">{p.views} views</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400" style={{ width: `${(p.views / max) * 100}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-white"><MapPin size={16} className="text-cyan-400" /> Who Viewed Projects</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-4 font-medium">Project</th>
                <th className="py-2 pr-4 font-medium"><Clock size={11} className="inline" /> When</th>
                <th className="py-2 pr-4 font-medium">IP Address</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="hidden py-2 pr-4 font-medium md:table-cell">Device</th>
                <th className="hidden py-2 pr-2 font-medium lg:table-cell">Referred From</th>
                <th className="py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjectViews.map((e, i) => (
                <tr key={e.id} className={`border-b border-white/5 text-slate-300 ${i === 0 ? 'bg-indigo-500/10' : ''}`}>
                  <td className="py-2 pr-4 font-medium text-white">{e.project}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-500">{new Date(e.created_at).toLocaleString('en-GB')}</td>
                  <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs text-slate-400">{e.info.ip || '—'}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-400">{e.location || '—'}</td>
                  <td className="hidden whitespace-nowrap py-2 pr-4 text-slate-500 md:table-cell">{e.device}</td>
                  <td className="hidden max-w-[180px] truncate py-2 pr-2 text-slate-500 lg:table-cell">{e.referrer}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => deleteEvent(e.id)} className="rounded p-1 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400" title="Delete this entry"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {projectViewDetails.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-slate-500">No project views recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {projectViewDetails.length > PROJECT_PAGE && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowAllProjects((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-400/40 hover:bg-white/10 hover:text-white"
            >
              {showAllProjects ? 'Show less' : `See more (${projectViewDetails.length - PROJECT_PAGE} more)`}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-white"><Download size={16} className="text-emerald-400" /> Resume Activity — who downloaded / viewed</h3>
          <span className="text-xs text-slate-500">{stats.resumeDownloads} downloads · {stats.resumeViews} views total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium"><Clock size={11} className="inline" /> When</th>
                <th className="py-2 pr-4 font-medium">IP Address</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="hidden py-2 pr-4 font-medium md:table-cell">Device</th>
                <th className="hidden py-2 pr-4 font-medium lg:table-cell">ISP</th>
                <th className="hidden py-2 pr-2 font-medium xl:table-cell">Referred From</th>
                <th className="py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleResumeActivity.map((e, i) => {
                const isDownload = e.type === 'resume_download';
                return (
                  <tr key={e.id} className={`border-b border-white/5 text-slate-300 ${i === 0 ? 'bg-emerald-500/10' : ''}`}>
                    <td className="py-2 pr-4">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${isDownload ? 'bg-emerald-500/15 text-emerald-300' : 'bg-violet-500/15 text-violet-300'}`}>
                        {isDownload ? 'Download' : 'View'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 text-slate-400">{new Date(e.created_at).toLocaleString('en-GB')}</td>
                    <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs text-slate-400">{e.info.ip || '—'}</td>
                    <td className="whitespace-nowrap py-2 pr-4 text-slate-400">{e.location || '—'}</td>
                    <td className="hidden whitespace-nowrap py-2 pr-4 text-slate-500 md:table-cell">{e.device}</td>
                    <td className="hidden max-w-[160px] truncate py-2 pr-4 text-slate-500 lg:table-cell">{e.info.isp || '—'}</td>
                    <td className="hidden max-w-[180px] truncate py-2 pr-2 text-slate-500 xl:table-cell">{e.referrer}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => deleteEvent(e.id)} className="rounded p-1 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400" title="Delete this entry"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
              {resumeActivity.length === 0 && (
                <tr><td colSpan={8} className="py-6 text-center text-slate-500">No resume downloads or views recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {resumeActivity.length > RESUME_PAGE && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowAllResume((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-400/40 hover:bg-white/10 hover:text-white"
            >
              {showAllResume ? 'Show less' : `See more (${resumeActivity.length - RESUME_PAGE} more)`}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle size={16} className="text-violet-400" />
          <h3 className="font-semibold text-white">Assistant Inquiries (Latest 20)</h3>
        </div>
        <div className="space-y-2">
          {assistantQuestions.map((e) => (
            <div key={e.id} className="flex items-start justify-between gap-4 rounded-xl bg-white/[0.03] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-white">{e.meta || '(empty question)'}</p>
                <p className="text-xs text-slate-500">referred from {e.referrer} · {new Date(e.created_at).toLocaleString('en-GB')}</p>
              </div>
            </div>
          ))}
          {assistantQuestions.length === 0 && <p className="text-sm text-slate-500">No assistant chats yet.</p>}
        </div>
      </div>
    </div>
  );
}
