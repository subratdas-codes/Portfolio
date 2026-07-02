import { useSingleton } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Sparkles } from 'lucide-react';

export function About() {
  const about = useSingleton('about');
  const profile = useSingleton('profile');

  return (
    <section id="about" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="About Me" title={about.headline} />
        <div className="grid gap-10 lg:grid-cols-5">
          <Reveal className="lg:col-span-3" delay={0.1}>
            <div className="space-y-4 text-lg leading-relaxed text-slate-300">
              {about.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {about.highlights.map((h) => (
                <div key={h.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition hover:border-indigo-400/40 hover:bg-white/10">
                  <div className="text-2xl font-bold text-white">{h.value}</div>
                  <div className="mt-1 text-xs text-slate-400">{h.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.2} className="lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
              <div className="mb-4 flex items-center gap-2 text-indigo-300">
                <Sparkles size={18} /> <span className="font-semibold">Quick Facts</span>
              </div>
              <dl className="space-y-3">
                {about.facts.map((f) => (
                  <div key={f.label} className="flex items-center justify-between border-b border-white/5 pb-2">
                    <dt className="text-sm text-slate-400">{f.label}</dt>
                    <dd className="font-medium text-white">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 rounded-xl bg-indigo-500/10 p-4 text-sm text-indigo-200">
                📍 {profile.location} · ✉️ {profile.email}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
