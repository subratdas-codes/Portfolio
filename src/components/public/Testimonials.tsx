import { useCollection } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Quote, Star } from 'lucide-react';

export function Testimonials() {
  const items = useCollection('testimonials');
  return (
    <section id="testimonials" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Testimonials" title="What people say" subtitle="Words from mentors, managers, and collaborators." />
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.1}>
              <figure className="relative h-full rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
                <Quote className="absolute right-4 top-4 text-indigo-500/20" size={40} />
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => <Star key={j} size={14} className="fill-amber-400 text-amber-400" />)}
                </div>
                <blockquote className="text-sm leading-relaxed text-slate-300">"{t.quote}"</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  <img src={t.avatar_url} alt={t.name} className="h-11 w-11 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.role} · {t.company}</div>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
