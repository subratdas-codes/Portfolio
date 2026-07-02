import { useCollection } from '../../hooks/useStore';
import { SectionHeading } from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import { Modal } from '../ui/Modal';
import { useState } from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import type { Blog } from '../../lib/types';

export function Blogs() {
  const blogs = useCollection('blogs').filter((b) => b.published);
  const [active, setActive] = useState<Blog | null>(null);
  return (
    <section id="blogs" className="relative py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow="Blog" title="Writing & thoughts" subtitle="Lessons learned while building and studying software." />
        <div className="grid gap-6 md:grid-cols-3">
          {blogs.map((b, i) => (
            <Reveal key={b.id} delay={i * 0.08}>
              <button onClick={() => setActive(b)} className="group block h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left transition hover:-translate-y-1 hover:border-indigo-400/40">
                <div className="aspect-video overflow-hidden">
                  <img src={b.cover_url} alt={b.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-1.5">
                    {b.tags.slice(0, 2).map((t) => <span key={t} className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">{t}</span>)}
                  </div>
                  <h3 className="mt-3 font-bold text-white group-hover:text-indigo-300">{b.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">{b.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> {b.read_time} min</span>
                    <span className="flex items-center gap-1 text-indigo-300">Read <ArrowRight size={12} /></span>
                  </div>
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title} maxWidth="max-w-2xl">
        {active && (
          <div className="space-y-4">
            <img src={active.cover_url} alt={active.title} className="aspect-video w-full rounded-xl object-cover" />
            <div className="flex flex-wrap gap-2">{active.tags.map((t) => <span key={t} className="rounded-md bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">{t}</span>)}</div>
            <p className="whitespace-pre-line leading-relaxed text-slate-300">{active.content}</p>
          </div>
        )}
      </Modal>
    </section>
  );
}
