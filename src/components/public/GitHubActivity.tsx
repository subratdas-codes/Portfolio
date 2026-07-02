import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Star, GitFork, Users, Code2, GitCommit } from 'lucide-react';
import { useSingleton } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { CardSkeleton } from '../ui/Skeleton';
import { fetchGitHubData, type GitHubStats } from '../../lib/github';

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Java: '#b07219',
  HTML: '#e34c26', CSS: '#563d7c', Cplusplus: '#f34b7d', Go: '#00ADD8', Shell: '#89e051',
};

export function GitHubActivity() {
  const profile = useSingleton('profile');
  const [data, setData] = useState<GitHubStats | null>(null);

  useEffect(() => {
    let alive = true;
    fetchGitHubData(profile.github_username).then((d) => alive && setData(d));
    return () => { alive = false; };
  }, [profile.github_username]);

  return (
    <section id="github" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="GitHub" title="Live GitHub activity" subtitle="Auto-synced from the GitHub API — no manual updates." />

        {!data ? (
          <div className="grid gap-6 md:grid-cols-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        ) : data.error ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <Github size={32} className="mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400">{data.error}</p>
            <a href={`https://github.com/${profile.github_username}`} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20" target="_blank" rel="noreferrer">
              <Github size={15} /> Visit @{profile.github_username}
            </a>
          </div>
        ) : (
          <>
            <Reveal className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Users, label: 'Followers', value: data.user?.followers ?? 0 },
                { icon: Users, label: 'Following', value: data.user?.following ?? 0 },
                { icon: Star, label: 'Total Stars', value: data.totalStars },
                { icon: Code2, label: 'Public Repos', value: data.user?.public_repos ?? 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center transition hover:border-indigo-400/40">
                  <s.icon className="mx-auto mb-2 text-indigo-400" size={22} />
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              ))}
            </Reveal>

            <div className="grid gap-6 lg:grid-cols-3">
              <Reveal className="lg:col-span-2" delay={0.1}>
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-white"><Github size={18} /> Pinned Repositories</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {data.repos.map((r, i) => (
                    <motion.a key={r.id} href={r.html_url} target="_blank" rel="noreferrer" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                      className="group rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-indigo-400/40 hover:bg-white/10">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white group-hover:text-indigo-300">{r.name}</span>
                        <span className="flex items-center gap-2 text-xs text-slate-400"><Star size={12} /> {r.stargazers_count} <GitFork size={12} /> {r.forks_count}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-400">{r.description ?? 'No description'}</p>
                      {r.language && <span className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400"><span className="h-2.5 w-2.5 rounded-full" style={{ background: LANG_COLORS[r.language] ?? '#888' }} /> {r.language}</span>}
                    </motion.a>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={0.2}>
                <h3 className="mb-4 font-semibold text-white">Languages</h3>
                <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  {data.languages.map((l) => (
                    <div key={l.name}>
                      <div className="mb-1 flex justify-between text-xs text-slate-300"><span>{l.name}</span><span>{l.percent}%</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${l.percent}%`, background: LANG_COLORS[l.name] ?? '#6366f1' }} />
                      </div>
                    </div>
                  ))}
                </div>
                {data.recentCommits.length > 0 && (
                  <>
                    <h3 className="mb-3 mt-6 flex items-center gap-2 font-semibold text-white"><GitCommit size={16} /> Recent Commits</h3>
                    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                      {data.recentCommits.slice(0, 5).map((c, i) => (
                        <a key={i} href={c.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-slate-400 hover:text-indigo-300">
                          <span className="text-indigo-400">{c.repo}:</span> {c.message}
                        </a>
                      ))}
                    </div>
                  </>
                )}
              </Reveal>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
