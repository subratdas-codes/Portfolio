import { useCollection } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Briefcase } from 'lucide-react';

export function Experience() {
  const items = useCollection('experience');
  return (
    <section id="experience" className="relative py-24">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading eyebrow="Experience" title="Where I've worked" subtitle="Roles that shaped my engineering approach." />
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-cyan-400 via-indigo-500 to-transparent" />
          <div className="space-y-10">
            {items.map((x, i) => (
              <Reveal key={x.id} delay={i * 0.1}>
                <div className="relative pl-14">
                  <div className="absolute left-4 top-6 z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500">
                    <Briefcase size={15} className="text-white" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/40 hover:bg-white/10">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {x.logo_url && <img src={x.logo_url} alt={x.company} className="h-10 w-10 rounded-lg object-contain" onError={(ev) => (ev.currentTarget.style.display = 'none')} />}
                        <div>
                          <h3 className="font-bold text-white">{x.role}</h3>
                          <p className="text-sm text-cyan-300">{x.company} · {x.type}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{x.start_date} – {x.end_date}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">📍 {x.location}</p>
                    <p className="mt-3 text-sm text-slate-300">{x.description}</p>
                    <ul className="mt-4 space-y-2">
                      {x.achievements.map((a, j) => (
                        <li key={j} className="flex gap-2 text-sm text-slate-400">
                          <span className="mt-1 text-cyan-400">▸</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
