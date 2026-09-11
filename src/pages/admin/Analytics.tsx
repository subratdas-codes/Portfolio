import { useMemo } from 'react';
import { Eye, Download, FolderGit2, Mail, Bot, Globe, TrendingUp, BarChart3, MapPin, Clock, MessageCircle } from 'lucide-react';
import { useCollection, useSingleton } from '../../hooks/useStore';

export function Analytics() {
  const analytics = useCollection('analytics');
  const projects = useCollection('projects');
  const resume = useSingleton('resume');

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

  // per-project "who viewed": each recorded project_view event with its referrer
  const projectViewDetails = useMemo(() => {
    const titleBySlug = new Map(projects.map((p) => [p.slug, p.title]));
    return analytics
      .filter((a) => a.type === 'project_view')
      .slice()
      .sort((a, b) => (b.created_at < a.created_at ? -1 : 1))
      .slice(0, 30)
      .map((e) => ({ ...e, project: titleBySlug.get(e.meta) || e.meta || '(unknown project)' }));
  }, [analytics, projects]);

  // latest assistant questions visitors asked the chat assistant
  const assistantQuestions = useMemo(
    () => analytics.filter((a) => a.type === 'assistant').slice().sort((a, b) => (b.created_at < a.created_at ? -1 : 1)).slice(0, 20),
    [analytics]
  );

  // last 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d.toISOString().slice(0, 10);
  });
  const daily = days.map((day) => analytics.filter((a) => a.created_at.slice(0, 10) === day).length);
  const maxDaily = Math.max(...daily, 1);

  const cards = [
    { label: 'Page Views', value: stats.pageViews, icon: Eye, color: 'from-indigo-500 to-blue-500' },
    { label: 'Project Views', value: stats.projectViews, icon: FolderGit2, color: 'from-cyan-500 to-teal-500' },
    { label: 'Resume Views', value: stats.resumeViews, icon: Eye, color: 'from-violet-500 to-purple-500' },
    { label: 'Resume Downloads', value: stats.resumeDownloads, icon: Download, color: 'from-emerald-500 to-green-500' },
    { label: 'Contact Requests', value: stats.contacts, icon: Mail, color: 'from-amber-500 to-orange-500' },
    { label: 'Assistant Interactions', value: stats.assistant, icon: Bot, color: 'from-rose-500 to-pink-500' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><BarChart3 size={24} className="text-indigo-400" /> Analytics</h1>
        <p className="text-sm text-slate-400">Visitor statistics and engagement metrics.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br ${c.color}`}><c.icon size={18} className="text-white" /></div>
            <div className="text-2xl font-bold text-white">{c.value}</div>
            <div className="text-xs text-slate-400">{c.label}</div>
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
          <h3 className="flex items-center gap-2 font-semibold text-white"><MapPin size={16} className="text-cyan-400" /> Who Viewed Projects (Latest 30)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-4 font-medium">Project</th>
                <th className="py-2 pr-4 font-medium">Referred From</th>
                <th className="hidden py-2 pr-4 font-medium md:table-cell">Path</th>
                <th className="py-2 font-medium"><Clock size={11} className="inline" /> When</th>
              </tr>
            </thead>
            <tbody>
              {projectViewDetails.map((e, i) => (
                <tr key={e.id} className={`border-b border-white/5 text-slate-300 ${i === 0 ? 'bg-indigo-500/10' : ''}`}>
                  <td className="py-2 pr-4 font-medium text-white">{e.project}</td>
                  <td className="max-w-[180px] truncate py-2 pr-4 text-slate-400">{e.referrer}</td>
                  <td className="hidden max-w-[160px] truncate py-2 pr-4 text-slate-500 md:table-cell">{e.path}</td>
                  <td className="whitespace-nowrap py-2 text-slate-500">{new Date(e.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {projectViewDetails.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-slate-500">No project views recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
                <p className="text-xs text-slate-500">referred from {e.referrer} · {new Date(e.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {assistantQuestions.length === 0 && <p className="text-sm text-slate-500">No assistant chats yet.</p>}
        </div>
      </div>
    </div>
  );
}
