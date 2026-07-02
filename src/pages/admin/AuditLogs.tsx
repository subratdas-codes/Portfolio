import { useState } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { useCollection } from '../../hooks/useStore';

export function AuditLogs() {
  const logs = useCollection('audit_logs');
  const [query, setQuery] = useState('');

  const filtered = logs.filter((l) =>
    !query || `${l.action} ${l.entity} ${l.details}`.toLowerCase().includes(query.toLowerCase())
  );

  const color = (action: string) => {
    if (action.startsWith('insert')) return 'text-emerald-400';
    if (action.startsWith('delete')) return 'text-rose-400';
    if (action.startsWith('update')) return 'text-amber-400';
    if (action.startsWith('login') || action.startsWith('logout')) return 'text-violet-400';
    return 'text-indigo-400';
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><ScrollText size={24} className="text-indigo-400" /> Audit Logs</h1>
          <p className="text-sm text-slate-400">Track every change made in the CMS.</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search logs..." className="rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-400" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-white/10 bg-slate-900 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-white/5">
                  <td className={`px-4 py-3 font-medium ${color(l.action)}`}>{l.action}</td>
                  <td className="px-4 py-3 text-slate-300">{l.entity}</td>
                  <td className="px-4 py-3 text-slate-400">{l.details}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-500">No logs found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
