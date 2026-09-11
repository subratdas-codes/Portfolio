import { useCollection } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { GraduationCap, School } from 'lucide-react';

export function Education() {
  const raw = useCollection('education');
  const items = [...raw].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return (
    <section id="education" className="relative py-24">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading eyebrow="Education" title="Academic journey" subtitle="My educational background from school to postgraduate studies." />
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-indigo-500 via-cyan-400 to-transparent sm:left-1/2" />
          <div className="space-y-10">
            {items.map((e, i) => (
              <Reveal key={e.id} delay={i * 0.1}>
                <div className={`relative flex flex-col gap-4 sm:flex-row sm:items-center ${i % 2 ? 'sm:flex-row-reverse' : ''}`}>
                  <div className="sm:w-1/2" />
                  <div className="absolute left-4 top-6 z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 sm:left-1/2">
                    <GraduationCap size={16} className="text-white" />
                  </div>
                  <div className={`rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-indigo-400/40 hover:bg-white/10 sm:w-1/2 ${i % 2 ? 'sm:mr-8' : 'sm:ml-8'}`}>
                    <div className="flex items-start gap-4">
                      {e.logo_url ? (
                        <img src={e.logo_url} alt={e.institution} className="h-12 w-auto max-w-24 shrink-0 rounded-lg object-contain" onError={(ev) => { ev.currentTarget.style.display = 'none'; ev.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                      ) : null}
                      {/* Fallback icon when no logo */}
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-cyan-400/30 ${e.logo_url ? 'hidden' : ''}`}>
                        <School size={20} className="text-indigo-300" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{e.institution}</h3>
                        <p className="text-sm text-indigo-300">{e.degree}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">{e.field}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>📅 {e.start_date} – {e.end_date}</span>
                      <span className="font-semibold text-emerald-400">Score: {e.cgpa}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{e.description}</p>
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
