import { useCollection } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { ExternalLink } from 'lucide-react';

export function CodingProfiles() {
  const profiles = useCollection('coding_profiles');
  return (
    <section id="coding" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Coding Profiles" title="Competitive programming" subtitle="Where I sharpen my problem-solving edge." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {profiles.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <a href={p.url} target="_blank" rel="noreferrer" className="group block h-full rounded-2xl border border-white/10 bg-white/5 p-6 text-center transition hover:-translate-y-1 hover:border-indigo-400/40 hover:bg-white/10">
                <div className="text-4xl">{p.icon}</div>
                <h3 className="mt-3 font-bold text-white">{p.platform}</h3>
                <p className="text-xs text-slate-500">@{p.username}</p>
                <div className="mt-4 space-y-2">
                  {p.stats.map((s) => (
                    <div key={s.label} className="flex items-center justify-between border-b border-white/5 pb-1.5 text-sm">
                      <span className="text-slate-400">{s.label}</span>
                      <span className="font-semibold text-white">{s.value}</span>
                    </div>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-300">View <ExternalLink size={13} /></span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
